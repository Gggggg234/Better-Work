import type { PaymentProvider, PaymentSubject, CheckoutResult, ProviderPaymentStatus } from "./types";
import crypto from "node:crypto";

/**
 * Proveedor simulado, para desarrollo y para que la app funcione sin ninguna
 * pasarela configurada.
 *
 * No mueve dinero real: retiene el pago al instante (kind "held") y siempre
 * responde "aprobado". Así el flujo completo — pagar, retener, liberar — se
 * puede probar de punta a punta sin credenciales. Al definir `MP_ACCESS_TOKEN`
 * el sistema pasa solo a Mercado Pago.
 */
export const simulatedProvider: PaymentProvider = {
  id: "simulated",
  label: "Pago simulado (sin proveedor)",

  async createCheckout(_subject: PaymentSubject): Promise<CheckoutResult> {
    void _subject;
    return { kind: "held", providerRef: `sim_${crypto.randomBytes(8).toString("hex")}` };
  },

  async getStatus(): Promise<ProviderPaymentStatus> {
    return "approved";
  },

  async refund(): Promise<void> {
    /* nada que devolver: no se movió dinero real */
  },
};
