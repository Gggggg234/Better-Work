import { db } from "./db";

/**
 * Comisión de Better Work. Hoy el pago es externo (transferencia directa al
 * Mercado Pago del trabajador) y NO se cobra ninguna comisión: esta lógica
 * queda preparada para el día que se integre un proveedor de pagos (Mercado
 * Pago u otro) y la plataforma retenga automáticamente su porcentaje.
 *
 * Todo el cálculo vive acá para que sea el único punto a tocar al integrar
 * la API. El porcentaje es configurable desde el panel de administración.
 */
export const DEFAULT_COMMISSION_PCT = 5;
const KEY = "commissionPct";

export async function getCommissionPct(): Promise<number> {
  const s = await db.setting.findUnique({ where: { key: KEY } });
  const pct = s ? parseFloat(s.value) : DEFAULT_COMMISSION_PCT;
  return Number.isFinite(pct) ? pct : DEFAULT_COMMISSION_PCT;
}

export async function setCommissionPct(pct: number): Promise<void> {
  const value = String(Math.max(0, Math.min(50, pct)));
  await db.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value },
    update: { value },
  });
}

export type CommissionBreakdown = {
  amount: number;
  pct: number;
  commission: number;
  net: number;
};

/** Calcula la comisión y el neto para un monto dado. Puro y testeable. */
export function computeCommission(amount: number, pct: number): CommissionBreakdown {
  const commission = Math.round((amount * pct) / 100);
  return { amount, pct, commission, net: amount - commission };
}
