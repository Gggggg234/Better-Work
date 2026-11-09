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
  HELD: "Retenido por Manobra",
  RELEASED: "Liberado al profesional",
  REFUNDED: "Devuelto al cliente",
};

export const PAYMENT_HINT: Record<string, string> = {
  PENDING: "Estamos confirmando tu pago con el proveedor.",
  HELD: "El dinero está protegido. Se libera cuando confirmes el código de finalización.",
  RELEASED: "El trabajo se completó y el dinero se liberó al profesional.",
  REFUNDED: "El trabajo se canceló y te devolvimos el dinero.",
};

/** Lo mismo, contado desde el lado del profesional. */
export const PAYMENT_HINT_WORKER: Record<string, string> = {
  PENDING: "El cliente está completando el pago.",
  HELD: "El dinero ya está asegurado. Se te libera cuando ingreses el código de finalización.",
  RELEASED: "El trabajo se completó y el pago se liberó a tu cuenta de cobro.",
  REFUNDED: "El trabajo se canceló y el dinero se le devolvió al cliente.",
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

export type PriceBreakdown = {
  price: number; //       presupuesto acordado
  surcharge: number; //   recargo por urgencia (va al profesional)
  workAmount: number; //  price + surcharge: lo que se retiene para el trabajo
  serviceFee: number; //  tarifa de servicio que paga el cliente (Manobra)
  clientTotal: number; // lo que paga el cliente
  commission: number; //  lo que Manobra descuenta al profesional
  net: number; //         lo que cobra el profesional
};

/**
 * Desglose completo del cobro de un trabajo.
 *
 * Manobra gana por los dos lados: la tarifa de servicio que paga el cliente
 * encima del trabajo y la comisión que se descuenta al profesional al liberar.
 * El recargo por urgencia es íntegro para el profesional (menos la comisión).
 */
export function priceBreakdown(
  price: number,
  pct: { urgencyPct: number; serviceFeePct: number; commissionPct: number }
): PriceBreakdown {
  const surcharge = Math.round(price * (pct.urgencyPct / 100));
  const workAmount = price + surcharge;
  const serviceFee = Math.round(workAmount * (pct.serviceFeePct / 100));
  const { commission, net } = splitAmount(workAmount, pct.commissionPct);
  return { price, surcharge, workAmount, serviceFee, clientTotal: workAmount + serviceFee, commission, net };
}
