import { randomUUID } from "crypto";
import type { PaymentProvider } from "./types";

/**
 * Proveedor "manual": simula las operaciones mientras no hay una pasarela
 * real integrada. Siempre aprueba y genera una referencia local. Sirve para
 * ejercitar todo el flujo intermediado (cobro → retención → liberación)
 * con la misma interfaz que usará Mercado Pago.
 */
export const manualProvider: PaymentProvider = {
  name: "manual",

  async charge(req) {
    if (req.amount <= 0) return { ok: false, error: "Monto inválido." };
    return { ok: true, providerRef: `manual_chg_${randomUUID()}` };
  },

  async payout(req) {
    if (req.amount <= 0) return { ok: false, error: "Monto inválido." };
    return { ok: true, providerRef: `manual_out_${randomUUID()}` };
  },

  async refund() {
    return { ok: true, providerRef: `manual_ref_${randomUUID()}` };
  },
};
