/**
 * Ranking de trabajadores y empresas para búsquedas, mapa y sugerencias.
 *
 * Combina calidad + cercanía + reputación y suma el empuje de la publicidad
 * (y el del plan, en el caso de las empresas). La publicidad sube posiciones
 * pero está acotada a propósito: nunca reemplaza a la calidad.
 */
export type RankInput = {
  /** Empuje de la campaña activa (0 si no hay). Ver lib/ads.computeBoost. */
  boost: number;
  ratingAvg: number; // 0..5
  ratingCount: number;
  jobsDone: number;
  verified: boolean;
  distanceKm: number | null;
};

export function workerScore(w: RankInput): number {
  // Calidad (0..1): rating ponderado por cantidad de reseñas (bayesiano).
  const C = 8;
  const prior = 3.8;
  const quality = ((w.ratingAvg * w.ratingCount + prior * C) / (w.ratingCount + C)) / 5;

  // Cercanía (0..1): decae con la distancia (~a 15 km cae a la mitad).
  const proximity = w.distanceKm == null ? 0.4 : 1 / (1 + w.distanceKm / 15);

  // Reputación (0..1): volumen de trabajos + verificación.
  const reputation = Math.min(1, Math.log10(1 + w.jobsDone) / 2.5) * 0.85 + (w.verified ? 0.15 : 0);

  const base = quality * 0.5 + proximity * 0.3 + reputation * 0.2;
  return base + Math.max(0, Math.min(0.45, w.boost));
}

/** Puntaje para ordenar publicaciones del feed (recencia + patrocinio + interacción). */
export function postScore(p: {
  sponsored: boolean;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
}): number {
  const ageHours = (Date.now() - p.createdAt.getTime()) / 3_600_000;
  const recency = 1 / (1 + ageHours / 24); // decae ~1 día
  const engagement = Math.min(1, Math.log10(1 + p.likeCount + p.commentCount * 2) / 2);
  return recency * 0.7 + engagement * 0.3 + (p.sponsored ? 0.5 : 0);
}

/** ¿Está vigente el patrocinio? */
export function isSponsored(until: Date | null | undefined): boolean {
  return !!until && until.getTime() > Date.now();
}

/** Empuje efectivo: sólo cuenta si la campaña sigue vigente. */
export function activeBoost(until: Date | null | undefined, boost: number): number {
  return isSponsored(until) ? boost : 0;
}
