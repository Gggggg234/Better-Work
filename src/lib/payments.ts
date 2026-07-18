/**
 * Pago del trabajo con dinero retenido (escrow).
 *
 * Better Work actúa de intermediario: el cliente paga antes de que empiece el
 * trabajo, el dinero queda RETENIDO y sólo se libera cuando se confirma el
 * código de finalización. Si el trabajo se cancela antes de empezar, se
 * devuelve.
 *
 * Hoy NO hay pasarela: el pago es una transferencia que el Super Admin
 * confirma (method MANUAL). La máquina de estados ya es la definitiva, así que
 * integrar un proveedor consiste en:
 *   1. Crear el Payment igual que ahora, con `method` del proveedor.
 *   2. Redirigir al checkout y guardar su id en `providerRef`.
 *   3. Llamar a las mismas transiciones (`HELD` al acreditar, `RELEASED` al
 *      liberar, `REFUNDED` al devolver) desde el webhook.
 * Ninguna pantalla ni ninguna otra acción necesita cambiar.
 */

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  HELD: "HELD",
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED",
} as const;

export type PaymentStatus = keyof typeof PAYMENT_STATUS;

export const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Esperando confirmación",
  HELD: "Retenido por Better Work",
  RELEASED: "Liberado al profesional",
  REFUNDED: "Devuelto al cliente",
};

export const PAYMENT_HINT: Record<string, string> = {
  PENDING: "Recibimos tu comprobante. Lo confirmamos y el trabajo puede empezar.",
  HELD: "El dinero está protegido. Se libera cuando confirmes el código de finalización.",
  RELEASED: "El trabajo se completó y el dinero se liberó al profesional.",
  REFUNDED: "El trabajo se canceló y el dinero volvió al cliente.",
};

/** Estados en los que el trabajo ya se puede iniciar. */
export function isPaid(status: string | null | undefined): boolean {
  return status === "HELD" || status === "RELEASED";
}

/** Un trabajo con precio necesita el pago acreditado antes de arrancar. */
export function needsPayment(price: number | null, status: string | null | undefined): boolean {
  return price != null && price > 0 && !isPaid(status);
}
