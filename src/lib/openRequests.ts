import { db } from "@/lib/db";
import { distanceKm } from "@/lib/geo";

/**
 * Reglas del pedido abierto (varios profesionales cotizan un mismo pedido).
 *
 * Ciclo: OPEN → ASSIGNED (el cliente eligió una cotización y se creó el Job)
 *             → CANCELLED (lo cerró el cliente). Vencido = OPEN con
 * `expiresAt` pasado: no se guarda como estado, se calcula.
 */

/** Tope de cotizaciones por pedido: suficientes para comparar sin saturar. */
export const MAX_BIDS = 10;

/** Cuánto queda abierto un pedido: 1 día si es urgente, 7 si no. */
export function expiryFrom(now: Date, urgent: boolean): Date {
  return new Date(now.getTime() + (urgent ? 1 : 7) * 86_400_000);
}

/** Radio mínimo de búsqueda, aunque el profesional haya puesto uno menor. */
const MIN_RADIUS_KM = 5;

type RequestLike = { status: string; expiresAt: Date };

export function isOpen(r: RequestLike, now = new Date()): boolean {
  return r.status === "OPEN" && r.expiresAt > now;
}

export function requestStatusLabel(r: RequestLike, now = new Date()): string {
  if (r.status === "ASSIGNED") return "Profesional elegido";
  if (r.status === "CANCELLED") return "Cerrado";
  return r.expiresAt > now ? "Recibiendo presupuestos" : "Vencido";
}

export const BID_STATUS_LABEL: Record<string, string> = {
  PENDING: "Enviado",
  ACCEPTED: "Elegido",
  REJECTED: "No elegido",
  WITHDRAWN: "Retirado",
};

/** ¿Llega el profesional a ese pedido? Sin coordenadas de alguno, se asume que sí. */
export function withinReach(
  worker: { lat: number | null; lng: number | null; radiusKm: number },
  req: { lat: number | null; lng: number | null }
): { ok: boolean; km: number | null } {
  if (worker.lat == null || worker.lng == null || req.lat == null || req.lng == null) return { ok: true, km: null };
  const km = distanceKm(worker.lat, worker.lng, req.lat, req.lng);
  return { ok: km <= Math.max(worker.radiusKm, MIN_RADIUS_KM), km };
}

/**
 * Pedidos abiertos que puede cotizar un profesional: de su oficio, dentro de
 * su radio, sin vencer y que no sean propios.
 */
export async function openRequestsFor(worker: {
  userId: string;
  categoryId: string | null;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
}) {
  if (!worker.categoryId) return [];
  const rows = await db.openRequest.findMany({
    where: {
      status: "OPEN",
      categoryId: worker.categoryId,
      expiresAt: { gt: new Date() },
      clientId: { not: worker.userId },
    },
    orderBy: [{ urgent: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      zone: true,
      lat: true,
      lng: true,
      urgent: true,
      scheduledFor: true,
      createdAt: true,
      expiresAt: true,
      _count: { select: { bids: { where: { status: "PENDING" } } } },
      bids: { where: { workerId: worker.userId }, select: { status: true, price: true } },
    },
  });
  return rows
    .map((r) => ({ ...r, reach: withinReach(worker, r), myBid: r.bids[0] ?? null }))
    .filter((r) => r.reach.ok);
}
