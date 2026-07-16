import type { PaymentProvider } from "./types";
import { manualProvider } from "./manual";

/**
 * Punto único de selección del proveedor de pagos. Cuando se integre
 * Mercado Pago: crear `mercadopago.ts` implementando PaymentProvider y
 * devolverlo acá (idealmente según una variable de entorno).
 */
export function getPaymentProvider(): PaymentProvider {
  return manualProvider;
}

export type { PaymentProvider, ChargeRequest, PayoutRequest, ProviderResult } from "./types";
