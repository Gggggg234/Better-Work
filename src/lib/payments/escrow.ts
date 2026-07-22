/**
 * Reglas de dominio del pago retenido (escrow), independientes del proveedor.
 *
 * Ciclo de vida: PENDING → HELD → RELEASED / REFUNDED.
 * El trabajo no puede iniciar hasta que el pago esté HELD, y el dinero sólo se
 * libera (con la comisión descontada) al confirmarse el código de finalización.
 */

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  HELD: "HELD",
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED",
} as const;

export const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Pago iniciado",
  HELD: "Retenido por Better Work",
  RELEASED: "Liberado al profesional",
  REFUNDED: "Devuelto al cliente",
};

export const PAYMENT_HINT: Record<string, string> = {
  PENDING: "Estamos confirmando tu pago con el proveedor.",
  HELD: "El dinero está protegido. Se libera cuando confirmes el código de finalización.",
  RELEASED: "El trabajo se completó y el dinero se liberó al profesional.",
  REFUNDED: "El trabajo se canceló y te devolvimos el dinero.",
};

export type PaymentLike = { status: string } | null | undefined;

/** El dinero está retenido: el trabajo ya puede arrancar. */
export function isHeld(payment: PaymentLike): boolean {
  return payment?.status === "HELD";
}

/** ¿Falta pagar/retener para poder iniciar? Un trabajo sin precio no bloquea. */
export function needsPayment(price: number | null, payment: PaymentLike): boolean {
  if (price == null || price <= 0) return false;
  return payment?.status !== "HELD" && payment?.status !== "RELEASED";
}

/** Comisión y neto al profesional, dado el total y el porcentaje. */
export function splitAmount(amount: number, commissionPct: number): { commission: number; net: number } {
  const commission = Math.round(amount * (commissionPct / 100));
  return { commission, net: Math.max(0, amount - commission) };
}
