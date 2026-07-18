import { db } from "./db";

/**
 * Lecturas de las solicitudes de membresía.
 *
 * Va aparte de `actions/planRequests.ts` a propósito: eso es "use server" y
 * todo lo que exporta queda expuesto como server action. Un contador que sólo
 * se lee no tiene por qué serlo.
 */

/** Pagos esperando revisión. Alimenta el contador del panel Super Admin. */
export async function countPendingPlanRequests(): Promise<number> {
  try {
    return await db.planRequest.count({ where: { status: "PENDING" } });
  } catch {
    // El contador nunca debe romper el layout del panel.
    return 0;
  }
}

export const PLAN_REQUEST_STATUS: Record<string, string> = {
  PENDING: "Pendiente de aprobación",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};
