import type {
  PaymentProvider,
  PaymentSubject,
  CheckoutResult,
  ProviderPaymentStatus,
} from "./types";
import { siteUrl } from "@/lib/mail";

/**
 * Proveedor Mercado Pago (Checkout Pro).
 *
 * Implementado con `fetch` contra la API REST — sin SDK, para no sumar
 * dependencias. Se activa sólo si está `MP_ACCESS_TOKEN`.
 *
 * Flujo de retención:
 *  1. `createCheckout` crea una *preferencia* y devuelve la URL del checkout.
 *  2. El cliente paga en Mercado Pago.
 *  3. Mercado Pago llama al webhook `/api/pagos/webhook`, que re-consulta el
 *     pago con `getStatus`. Si está aprobado, el Payment pasa a HELD.
 *  4. Al confirmarse el código de finalización, se libera al trabajador.
 *
 * Nota sobre "retención real": Mercado Pago no expone un escrow nativo para
 * terceros en la API estándar. Hasta habilitar split payments / marketplace,
 * el dinero entra a la cuenta de Better Work y la transferencia al trabajador
 * se hace desde ahí (igual que el modelo antiguo documentado). La máquina de
 * estados ya contempla HELD → RELEASED, así que activar el split es cambiar
 * sólo este archivo.
 */

const API = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("MP_ACCESS_TOKEN no está definido.");
  return t;
}

/** Con credenciales de prueba (TEST-...) se usa el checkout de sandbox. */
function isSandbox(): boolean {
  return (process.env.MP_ACCESS_TOKEN ?? "").startsWith("TEST-");
}

async function mpFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export const mercadoPagoProvider: PaymentProvider = {
  id: "mercadopago",
  label: "Mercado Pago",

  async createCheckout(subject: PaymentSubject): Promise<CheckoutResult> {
    const base = await siteUrl();
    const res = await mpFetch("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            title: subject.title,
            quantity: 1,
            unit_price: subject.amount,
            currency_id: "ARS",
          },
        ],
        // Referencia con la que el webhook encuentra el trabajo.
        external_reference: subject.jobId,
        ...(subject.payerEmail ? { payer: { email: subject.payerEmail } } : {}),
        back_urls: {
          success: `${base}/jobs/${subject.jobId}?pago=ok`,
          pending: `${base}/jobs/${subject.jobId}?pago=pendiente`,
          failure: `${base}/jobs/${subject.jobId}?pago=error`,
        },
        auto_return: "approved",
        notification_url: `${base}/api/pagos/webhook`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Mercado Pago rechazó la preferencia (${res.status}). ${detail.slice(0, 200)}`);
    }

    const pref = (await res.json()) as { id: string; init_point?: string; sandbox_init_point?: string };
    const url = (isSandbox() ? pref.sandbox_init_point : pref.init_point) ?? pref.init_point;
    if (!url) throw new Error("Mercado Pago no devolvió una URL de checkout.");

    // El providerRef es el id de la preferencia; el webhook trae el id del pago
    // y reconcilia por external_reference (jobId).
    return { kind: "redirect", url, providerRef: pref.id };
  },

  async getStatus(paymentId: string): Promise<ProviderPaymentStatus> {
    const res = await mpFetch(`/v1/payments/${paymentId}`);
    if (!res.ok) return "unknown";
    const data = (await res.json()) as { status?: string };
    switch (data.status) {
      case "approved":
        return "approved";
      case "pending":
      case "in_process":
      case "authorized":
        return "pending";
      case "rejected":
      case "cancelled":
        return "rejected";
      case "refunded":
      case "charged_back":
        return "refunded";
      default:
        return "unknown";
    }
  },

  async refund(paymentId: string): Promise<void> {
    return refundPayment(paymentId);
  },
};

/**
 * Datos de un pago de Mercado Pago, para el webhook: estado + a qué trabajo
 * corresponde (external_reference) + el id del pago para reembolsar.
 */
export async function getMpPayment(
  paymentId: string
): Promise<{ status: ProviderPaymentStatus; jobId: string | null; paymentId: string } | null> {
  const res = await mpFetch(`/v1/payments/${paymentId}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { status?: string; external_reference?: string; id?: number };
  const map: Record<string, ProviderPaymentStatus> = {
    approved: "approved",
    pending: "pending",
    in_process: "pending",
    authorized: "pending",
    rejected: "rejected",
    cancelled: "rejected",
    refunded: "refunded",
    charged_back: "refunded",
  };
  return {
    status: map[data.status ?? ""] ?? "unknown",
    jobId: data.external_reference ?? null,
    paymentId: String(data.id ?? paymentId),
  };
}

async function refundPayment(paymentId: string): Promise<void> {
  const res = await mpFetch(`/v1/payments/${paymentId}/refunds`, { method: "POST", body: "{}" });
  if (!res.ok && res.status !== 422) {
    // 422 = ya reembolsado; cualquier otro error se propaga.
    const detail = await res.text().catch(() => "");
    throw new Error(`No se pudo reembolsar en Mercado Pago (${res.status}). ${detail.slice(0, 200)}`);
  }
}

// ── Suscripciones y pagos únicos de la plataforma (Pro, planes, billetera) ──

/** Estados de una suscripción tal como los devuelve Mercado Pago (incluye las dos grafías de "cancelada"). */
export type MpPreapproval = {
  id: string;
  status: string; // pending | authorized | paused | cancelled | canceled
  external_reference?: string;
  init_point?: string;
  next_payment_date?: string | null;
  summarized?: { charged_quantity?: number | null; last_charged_date?: string | null } | null;
};

async function mpJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await mpFetch(path, init);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Mercado Pago respondió ${res.status} en ${path}. ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Crea una suscripción mensual con débito automático ("sin plan asociado",
 * estado pending): devuelve el `init_point` donde la persona elige cómo pagar
 * y autoriza los cobros.
 */
export async function createPreapproval(input: {
  reason: string;
  externalReference: string;
  payerEmail: string;
  amount: number;
  backUrl: string;
}): Promise<MpPreapproval> {
  return mpJson<MpPreapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Math.round(input.amount * 100) / 100,
        currency_id: "ARS",
      },
      back_url: input.backUrl,
      status: "pending",
    }),
  });
}

export async function getPreapproval(id: string): Promise<MpPreapproval> {
  return mpJson<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`);
}

/** Cancela la suscripción: no se hacen más débitos (lo ya pagado sigue vigente). */
export async function cancelPreapproval(id: string): Promise<void> {
  await mpJson(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "canceled" }),
  }).catch(async () => {
    // La documentación usa "canceled"; si no se acepta, probamos la otra grafía.
    await mpJson(`/preapproval/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" }),
    });
  });
}

/** Un débito de una suscripción: sólo interesa a qué suscripción pertenece. */
export async function getAuthorizedPayment(id: string): Promise<{ preapproval_id?: string } | null> {
  const res = await mpFetch(`/authorized_payments/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return (await res.json()) as { preapproval_id?: string };
}

/** Pago único con Checkout Pro (tarjeta, dinero en cuenta, efectivo, etc.). */
export async function createOneTimePreference(input: {
  title: string;
  amount: number;
  externalReference: string;
  payerEmail?: string;
  backUrl: string;
  notificationUrl: string;
}): Promise<{ id: string; url: string }> {
  const sep = input.backUrl.includes("?") ? "&" : "?";
  const pref = await mpJson<{ id: string; init_point?: string; sandbox_init_point?: string }>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ title: input.title, quantity: 1, unit_price: Math.round(input.amount * 100) / 100, currency_id: "ARS" }],
      external_reference: input.externalReference,
      ...(input.payerEmail ? { payer: { email: input.payerEmail } } : {}),
      back_urls: {
        success: `${input.backUrl}${sep}mp=ok`,
        pending: `${input.backUrl}${sep}mp=pendiente`,
        failure: `${input.backUrl}${sep}mp=error`,
      },
      auto_return: "approved",
      notification_url: input.notificationUrl,
      statement_descriptor: "BETTER WORK",
    }),
  });
  const url = (isSandbox() ? pref.sandbox_init_point : pref.init_point) ?? pref.init_point;
  if (!url) throw new Error("Mercado Pago no devolvió una URL de pago.");
  return { id: pref.id, url };
}

/** Datos crudos de un pago (para reconciliar por `external_reference`). */
export async function getPaymentInfo(
  paymentId: string
): Promise<{ id: string; status: string; externalReference: string | null; amount: number } | null> {
  const res = await mpFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
  if (!res.ok) return null;
  const d = (await res.json()) as { id?: number; status?: string; external_reference?: string; transaction_amount?: number };
  return {
    id: String(d.id ?? paymentId),
    status: d.status ?? "unknown",
    externalReference: d.external_reference ?? null,
    amount: d.transaction_amount ?? 0,
  };
}
