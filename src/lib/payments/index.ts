import type { PaymentProvider } from "./types";
import { manualProvider } from "./manual";
import { mercadoPagoProvider } from "./mercadopago";

/**
 * Punto único de selección del proveedor de pagos.
 *
 * Con `MP_ACCESS_TOKEN` definido se usa Mercado Pago; si no, el proveedor
 * simulado (útil en desarrollo y para probar el flujo sin cobrar de verdad).
 * Para sumar otro proveedor: implementar `PaymentProvider` y devolverlo acá.
 */
export function getPaymentProvider(): PaymentProvider {
  return process.env.MP_ACCESS_TOKEN ? mercadoPagoProvider : manualProvider;
}

export function isLivePayments(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

export type {
  PaymentProvider,
  ChargeRequest,
  ChargeResult,
  ChargeSubject,
  PayoutRequest,
  ProviderResult,
} from "./types";
export { encodeSubject, decodeSubject } from "./types";
