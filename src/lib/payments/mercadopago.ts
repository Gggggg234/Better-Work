import type { PaymentProvider, ChargeResult, ProviderResult } from "./types";
import { encodeSubject } from "./types";

/**
 * Proveedor Mercado Pago (Checkout Pro).
 *
 * Modelo v1: el dinero se cobra a la cuenta de Mercado Pago de Better Work.
 * La plataforma queda como intermediaria (custodia) y libera el neto al
 * trabajador al finalizar el trabajo — ver nota en `payout`.
 *
 * Requiere `MP_ACCESS_TOKEN` (Mercado Pago → Tus integraciones → Credenciales).
 * Usá las credenciales de *prueba* para testear y las de producción al salir.
 */
const API = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("Falta MP_ACCESS_TOKEN para operar con Mercado Pago.");
  return t;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

async function mpFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** Devuelve la URL a la que hay que mandar al usuario para pagar. */
function checkoutUrl(pref: { init_point?: string; sandbox_init_point?: string }): string | null {
  // Con credenciales de prueba, MP devuelve el sandbox_init_point.
  const isTest = (process.env.MP_ACCESS_TOKEN ?? "").startsWith("TEST-");
  return (isTest ? pref.sandbox_init_point ?? pref.init_point : pref.init_point) ?? null;
}

export const mercadoPagoProvider: PaymentProvider = {
  name: "mercadopago",

  async charge(req): Promise<ChargeResult> {
    if (req.amount <= 0) return { ok: false, error: "Monto inválido." };

    const externalReference = encodeSubject(req.subject);
    const back = `${siteUrl()}/api/pagos/retorno`;

    try {
      const res = await mpFetch("/checkout/preferences", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              id: externalReference,
              title: req.description.slice(0, 250),
              quantity: 1,
              unit_price: Math.round(req.amount * 100) / 100,
              currency_id: "ARS",
            },
          ],
          external_reference: externalReference,
          // MP avisa acá cuando el pago cambia de estado (fuente de verdad).
          notification_url: `${siteUrl()}/api/webhooks/mercadopago`,
          back_urls: { success: back, pending: back, failure: back },
          auto_return: "approved",
          statement_descriptor: "BETTERWORK",
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        return { ok: false, error: `Mercado Pago rechazó la preferencia (${res.status}): ${detail.slice(0, 200)}` };
      }

      const pref = (await res.json()) as { id: string; init_point?: string; sandbox_init_point?: string };
      const url = checkoutUrl(pref);
      if (!url) return { ok: false, error: "Mercado Pago no devolvió un link de pago." };

      // El pago se confirma por webhook; acá sólo mandamos al checkout.
      return { ok: true, kind: "redirect", redirectUrl: url, providerRef: pref.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error al conectar con Mercado Pago." };
    }
  },

  /**
   * Mercado Pago no expone una API general para transferir a terceros: el
   * dinero queda en la cuenta de Better Work y la transferencia al trabajador
   * se hace desde el panel (los datos de cobro están en su PaymentAccount).
   *
   * Marcamos la liberación como pendiente de transferencia para que quede
   * asentada en el historial y visible en /admin/revenue.
   *
   * Para automatizarlo hay que migrar a "split de pagos" (marketplace_fee +
   * OAuth de la cuenta MP de cada trabajador). Ver README.
   */
  async payout(req): Promise<ProviderResult> {
    if (req.amount <= 0) return { ok: false, error: "Monto inválido." };
    return { ok: true, providerRef: `mp_manual_transfer_${req.jobId}` };
  },

  async refund(chargeRef, amount): Promise<ProviderResult> {
    // `chargeRef` es el id del pago aprobado (lo guarda el webhook).
    try {
      const res = await mpFetch(`/v1/payments/${chargeRef}/refunds`, {
        method: "POST",
        body: JSON.stringify({ amount: Math.round(amount * 100) / 100 }),
      });
      if (!res.ok) {
        const detail = await res.text();
        return { ok: false, error: `No se pudo devolver el pago (${res.status}): ${detail.slice(0, 200)}` };
      }
      const data = (await res.json()) as { id: number | string };
      return { ok: true, providerRef: String(data.id) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error al conectar con Mercado Pago." };
    }
  },
};

/** Consulta un pago en Mercado Pago (usado por el webhook y el retorno). */
export async function getMercadoPagoPayment(paymentId: string): Promise<{
  status: string;
  externalReference: string;
  amount: number;
} | null> {
  try {
    const res = await mpFetch(`/v1/payments/${paymentId}`);
    if (!res.ok) return null;
    const p = (await res.json()) as {
      status?: string;
      external_reference?: string;
      transaction_amount?: number;
    };
    if (!p.status || !p.external_reference) return null;
    return {
      status: p.status,
      externalReference: p.external_reference,
      amount: p.transaction_amount ?? 0,
    };
  } catch {
    return null;
  }
}
