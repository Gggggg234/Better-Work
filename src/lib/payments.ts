import { getSetting } from "./settings";

/**
 * Pago directo entre cliente y trabajador, con seña.
 *
 * Better Work **no recibe ni retiene** el dinero de los trabajos: el cliente
 * le transfiere al profesional a su alias. La app sólo deja constancia y usa
 * esa constancia para habilitar los pasos:
 *
 *   1. El trabajador acepta.
 *   2. El cliente le transfiere la SEÑA y lo marca en la app.
 *   3. El trabajador confirma que la recibió.       ← sin esto no arranca
 *   4. Códigos de inicio y finalización, como siempre.
 *   5. Al terminar, el cliente paga el SALDO y el trabajador lo confirma.
 *
 * La seña compromete a las dos partes: el cliente no deja plantado al
 * profesional que ya se movió, y el profesional no abandona un trabajo por el
 * que ya cobró una parte.
 *
 * Los ingresos de Better Work (membresías y publicidad) siguen siendo aparte y
 * ésos sí pasan por la plataforma.
 */

export const PAYMENT_KIND = { DEPOSIT: "DEPOSIT", FINAL: "FINAL" } as const;
export const PAYMENT_STATUS = { SENT: "SENT", CONFIRMED: "CONFIRMED" } as const;

export const KIND_LABEL: Record<string, string> = {
  DEPOSIT: "Seña",
  FINAL: "Saldo final",
};

export const STATUS_LABEL: Record<string, string> = {
  SENT: "Esperando confirmación",
  CONFIRMED: "Confirmado",
};

export type PaymentRow = {
  kind: string;
  amount: number;
  status: string;
  note?: string;
};

/** Porcentaje sugerido de seña (editable desde el panel Super Admin). */
export async function getDepositPct(): Promise<number> {
  const raw = parseFloat(await getSetting("deposit_pct", "30"));
  return Number.isFinite(raw) && raw > 0 && raw <= 100 ? raw : 30;
}

/** Seña sugerida para un precio, redondeada a los $100 más cercanos. */
export function suggestedDeposit(price: number, pct: number): number {
  return Math.max(0, Math.round((price * pct) / 100 / 100) * 100);
}

export function findPayment(payments: PaymentRow[], kind: string): PaymentRow | undefined {
  return payments.find((p) => p.kind === kind);
}

/** La seña está confirmada por el trabajador: el trabajo puede empezar. */
export function depositConfirmed(payments: PaymentRow[]): boolean {
  return findPayment(payments, "DEPOSIT")?.status === "CONFIRMED";
}

/**
 * ¿Falta la seña para poder arrancar?
 *
 * Un trabajo sin seña acordada (o sin precio) no bloquea nada: se sigue
 * pudiendo coordinar todo por chat como antes.
 */
export function depositPending(deposit: number | null, payments: PaymentRow[]): boolean {
  if (!deposit || deposit <= 0) return false;
  return !depositConfirmed(payments);
}

/** Lo que queda por pagar al terminar. */
export function remainingAmount(price: number | null, deposit: number | null): number {
  return Math.max(0, (price ?? 0) - (deposit ?? 0));
}
