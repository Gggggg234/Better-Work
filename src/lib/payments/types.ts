/**
 * Abstracción del proveedor de pagos. Better Work actúa como intermediario:
 * cobra al cliente, retiene la comisión y libera el neto al trabajador.
 *
 * Soporta dos modelos de cobro:
 *  - "captured": el cobro se resuelve en el momento (proveedor simulado).
 *  - "redirect": hay que mandar al usuario al checkout del proveedor y esperar
 *    la confirmación por webhook (Mercado Pago Checkout Pro).
 *
 * Integrar otro proveedor = implementar esta interfaz y activarlo en
 * `lib/payments/index.ts`. El resto de la app no cambia.
 */

/** Qué se está cobrando. Viaja al proveedor y vuelve en el webhook. */
export type ChargeSubject =
  | { type: "JOB"; jobId: string }
  | { type: "COMPANY_PLAN"; companyProfileId: string; days: number }
  | { type: "PROMO"; kind: "PROFILE" | "OFFER" | "POST"; refId: string; days: number };

export type ChargeRequest = {
  subject: ChargeSubject;
  payerId: string;
  amount: number;
  description: string;
  /** Cuenta de pago del cliente (PaymentAccount purpose=PAYMENT), si aplica. */
  accountId?: string | null;
};

export type PayoutRequest = {
  jobId: string;
  payeeId: string;
  amount: number;
  /** Cuenta de cobro del trabajador (PaymentAccount purpose=PAYOUT). */
  accountId?: string | null;
  /** Referencia del cobro original, para conciliación. */
  chargeRef?: string;
};

export type ChargeResult =
  /** Cobrado y acreditado ya: la app puede registrar el pago al instante. */
  | { ok: true; kind: "captured"; providerRef: string }
  /** Hay que llevar al usuario al checkout; el webhook confirma después. */
  | { ok: true; kind: "redirect"; redirectUrl: string; providerRef: string }
  | { ok: false; error: string };

export type ProviderResult = { ok: true; providerRef: string } | { ok: false; error: string };

export interface PaymentProvider {
  /** Identificador del proveedor (p. ej. "manual", "mercadopago"). */
  readonly name: string;
  /** Inicia el cobro al cliente. */
  charge(req: ChargeRequest): Promise<ChargeResult>;
  /** Transfiere el neto (monto − comisión) al trabajador. */
  payout(req: PayoutRequest): Promise<ProviderResult>;
  /** Devuelve un cobro (trabajo cancelado antes de empezar). */
  refund(chargeRef: string, amount: number): Promise<ProviderResult>;
}

/** Serializa el motivo del cobro para `external_reference`. */
export function encodeSubject(s: ChargeSubject): string {
  if (s.type === "JOB") return `JOB:${s.jobId}`;
  if (s.type === "COMPANY_PLAN") return `COMPANY_PLAN:${s.companyProfileId}:${s.days}`;
  return `PROMO:${s.kind}:${s.refId}:${s.days}`;
}

/** Parsea el `external_reference` que vuelve del proveedor. */
export function decodeSubject(ref: string): ChargeSubject | null {
  const p = ref.split(":");
  if (p[0] === "JOB" && p[1]) return { type: "JOB", jobId: p[1] };
  if (p[0] === "COMPANY_PLAN" && p[1]) {
    return { type: "COMPANY_PLAN", companyProfileId: p[1], days: parseInt(p[2]) || 30 };
  }
  if (p[0] === "PROMO" && p[1] && p[2]) {
    const kind = p[1] as "PROFILE" | "OFFER" | "POST";
    if (!["PROFILE", "OFFER", "POST"].includes(kind)) return null;
    return { type: "PROMO", kind, refId: p[2], days: parseInt(p[3]) || 7 };
  }
  return null;
}
