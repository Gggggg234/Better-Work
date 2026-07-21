import type { PaymentProvider } from "./types";
import { mercadoPagoProvider } from "./mercadopago";
import { simulatedProvider } from "./simulated";

/**
 * Registro de proveedores de pago.
 *
 * Hoy: Mercado Pago (si hay credenciales) o el simulado. Para sumar otro
 * gateway —tarjetas, otra billetera, transferencias, etc.— se agrega su
 * implementación de `PaymentProvider` a este mapa y se define cuándo se elige.
 * El resto del sistema usa siempre `getPaymentProvider()` y no conoce los
 * detalles de ninguno.
 */
const PROVIDERS: Record<string, PaymentProvider> = {
  [mercadoPagoProvider.id]: mercadoPagoProvider,
  [simulatedProvider.id]: simulatedProvider,
};

/** ¿Hay una pasarela real configurada? */
export function paymentsConfigured(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

/**
 * Devuelve el proveedor activo. Mercado Pago si está `MP_ACCESS_TOKEN`; si no,
 * el simulado, para que la app siga funcionando sin credenciales.
 */
export function getPaymentProvider(): PaymentProvider {
  if (process.env.MP_ACCESS_TOKEN) return PROVIDERS[mercadoPagoProvider.id];
  return PROVIDERS[simulatedProvider.id];
}

/** Busca un proveedor por id (para reconciliar un pago con su origen). */
export function providerById(id: string): PaymentProvider | undefined {
  return PROVIDERS[id];
}

export type { PaymentProvider, PaymentSubject, CheckoutResult, EscrowStatus } from "./types";
