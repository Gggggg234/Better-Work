import { db } from "./db";

/**
 * Lecturas de las solicitudes de membresía.
 *
 * Va aparte de `actions/planRequests.ts` a propósito: eso es "use server" y
 * todo lo que exporta queda expuesto como server action. Un contador que sólo
 * se lee no tiene por qué serlo.
 */

/**
 * Lo que espera aprobación manual del Super Admin: membresías y cargas de saldo
 * publicitario. Los pagos de trabajos NO entran acá: son directos entre cliente
 * y profesional, sin intermediación.
 */
export async function countPendingApprovals(): Promise<{
  plans: number;
  topUps: number;
  total: number;
}> {
  try {
    const [plans, topUps] = await Promise.all([
      db.planRequest.count({ where: { status: "PENDING" } }),
      db.walletTopUp.count({ where: { status: "PENDING" } }),
    ]);
    return { plans, topUps, total: plans + topUps };
  } catch {
    // El contador nunca debe romper el layout del panel.
    return { plans: 0, topUps: 0, total: 0 };
  }
}

export const PLAN_REQUEST_STATUS: Record<string, string> = {
  PENDING: "Pendiente de aprobación",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};
