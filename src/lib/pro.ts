import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

/**
 * Better Work Pro: suscripción mensual de los profesionales.
 *
 * Con pago directo entre cliente y profesional, Better Work no gana por
 * trabajo: gana por suscripciones (Pro y membresías de empresa) y publicidad.
 * Pro se paga por transferencia con comprobante, como las membresías.
 *
 * Beneficios (todos aplicados en el código):
 *  - Mejor posición en búsquedas y mapa (`PRO_BOOST`) e insignia PRO.
 *  - Presupuestos ilimitados en pedidos abiertos (sin Pro hay un tope mensual).
 */

export const PRO_DAYS = 30;
// El empuje en el ranking vive en lib/ranking.ts (PRO_BOOST / workerBoost).
/** Pro acumulado por regalos (referidos): nunca más de ~6 meses por delante. */
const MAX_AHEAD_DAYS = 180;
const DAY = 86_400_000;

export function isPro(proUntil: Date | null | undefined): boolean {
  return !!proUntil && proUntil.getTime() > Date.now();
}

export type ProConfig = { price: number; freeBids: number };

/** Precio mensual y tope de presupuestos sin Pro, editables por el Super Admin. */
export async function getProConfig(): Promise<ProConfig> {
  const s = await getSettings({ pro_price: "5000", pro_free_bids: "10" });
  const price = parseFloat(s.pro_price);
  const freeBids = parseInt(s.pro_free_bids, 10);
  return {
    price: Number.isFinite(price) && price >= 0 ? price : 5000,
    freeBids: Number.isFinite(freeBids) && freeBids >= 0 ? freeBids : 10,
  };
}

export function proBenefits(freeBids: number): string[] {
  return [
    "Aparecés más arriba en las búsquedas y en el mapa",
    "Insignia PRO en tu perfil y en tus presupuestos",
    `Presupuestos ilimitados en pedidos abiertos (sin Pro: ${freeBids} por mes)`,
  ];
}

/** Inicio del mes actual en hora argentina (el tope de presupuestos es mensual). */
function startOfMonthAR(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  return new Date(`${ymd.slice(0, 7)}-01T00:00:00-03:00`);
}

/** Presupuestos enviados este mes a pedidos abiertos (cuentan para el tope sin Pro). */
export async function bidsThisMonth(userId: string): Promise<number> {
  return db.bid.count({ where: { workerId: userId, createdAt: { gte: startOfMonthAR() } } });
}

/**
 * Suma días de Pro a partir del vencimiento vigente (o de hoy). Con `capped`,
 * no deja acumular más de ~6 meses (para regalos, no para lo pagado).
 */
export async function extendPro(userId: string, days: number, capped = false): Promise<Date | null> {
  const profile = await db.workerProfile.findUnique({ where: { userId }, select: { proUntil: true } });
  if (!profile) return null;
  const base = profile.proUntil && profile.proUntil > new Date() ? profile.proUntil : new Date();
  let until = new Date(base.getTime() + days * DAY);
  const max = new Date(Date.now() + MAX_AHEAD_DAYS * DAY);
  if (capped && until > max) until = max;
  await db.workerProfile.update({ where: { userId }, data: { proUntil: until } });
  return until;
}
