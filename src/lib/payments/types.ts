/**
 * Abstracción del proveedor de pagos. Better Work actúa como intermediario:
 * cobra al cliente (charge), retiene la comisión y transfiere el neto al
 * trabajador (payout). Integrar Mercado Pago u otro proveedor implica
 * únicamente implementar esta interfaz y cambiar el provider activo en
 * `lib/payments/index.ts` — el resto de la app no se toca.
 */

export type ChargeRequest = {
  jobId: string;
  payerId: string;
  amount: number;
  description: string;
  /** Cuenta de pago del cliente (PaymentAccount purpose=PAYMENT). */
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

export type ProviderResult =
  | { ok: true; providerRef: string }
  | { ok: false; error: string };

export interface PaymentProvider {
  /** Identificador del proveedor (p. ej. "manual", "mercadopago"). */
  readonly name: string;
  /** Cobra al cliente y deja el dinero en poder de Better Work. */
  charge(req: ChargeRequest): Promise<ProviderResult>;
  /** Transfiere el neto (monto − comisión) al trabajador. */
  payout(req: PayoutRequest): Promise<ProviderResult>;
  /** Devuelve un cobro retenido (trabajo cancelado). */
  refund(chargeRef: string, amount: number): Promise<ProviderResult>;
}
