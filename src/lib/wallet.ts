import { db } from "./db";

/**
 * Billetera de publicidad.
 *
 * El saldo entra por transferencia (aprobada a mano por el Super Admin) y sale
 * al lanzar una campaña. No hay pasarela: cuando se integre una, el único
 * cambio es agregar otra forma de acreditar saldo — el gasto ya funciona.
 */

export const TOPUP_PRESETS = [5000, 10000, 20000, 50000];
export const MIN_TOPUP = 1000;

export type WalletSummary = {
  id: string;
  balance: number;
  spent: number;
};

/** Devuelve la billetera del usuario, creándola la primera vez. */
export async function getOrCreateWallet(userId: string): Promise<WalletSummary> {
  const existing = await db.adWallet.findUnique({ where: { userId } });
  if (existing) return { id: existing.id, balance: existing.balance, spent: existing.spent };

  const created = await db.adWallet.create({ data: { userId } });
  return { id: created.id, balance: created.balance, spent: created.spent };
}

/** Sólo lectura: no crea la billetera (para pantallas que sólo muestran). */
export async function getWallet(userId: string): Promise<WalletSummary> {
  const w = await db.adWallet.findUnique({ where: { userId } });
  return w ? { id: w.id, balance: w.balance, spent: w.spent } : { id: "", balance: 0, spent: 0 };
}

export const TOPUP_STATUS: Record<string, string> = {
  PENDING: "Pendiente de aprobación",
  APPROVED: "Acreditada",
  REJECTED: "Rechazada",
};

/** Cargas esperando revisión. Alimenta el contador del panel Super Admin. */
export async function countPendingTopUps(): Promise<number> {
  try {
    return await db.walletTopUp.count({ where: { status: "PENDING" } });
  } catch {
    return 0;
  }
}
