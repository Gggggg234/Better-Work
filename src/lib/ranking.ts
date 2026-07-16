/**
 * Ranking de trabajadores para búsquedas, mapa y sugerencias.
 *
 * La posición combina patrocinio + calificación + cercanía + reputación, para
 * que la publicidad aumente la visibilidad SIN reemplazar la calidad: un perfil
 * patrocinado sube, pero uno pésimo no supera a uno excelente muy cercano.
 */
export type RankInput = {
  sponsored: boolean;
  ratingAvg: number; // 0..5
  ratingCount: number;
  jobsDone: number;
  verified: boolean;
  distanceKm: number | null;
};

export function workerScore(w: RankInput): number {
  // Calidad (0..1): rating ponderado por cantidad de reseñas (evita que 1 reseña
  // de 5★ pese igual que 200). Bayesiano simple.
  const C = 8; // reseñas "de confianza"
  const prior = 3.8;
  const quality = ((w.ratingAvg * w.ratingCount + prior * C) / (w.ratingCount + C)) / 5;

  // Cercanía (0..1): decae con la distancia (~a 15km cae a la mitad).
  const proximity = w.distanceKm == null ? 0.4 : 1 / (1 + w.distanceKm / 15);

  // Reputación (0..1): experiencia acumulada de trabajos + verificación.
  const reputation = Math.min(1, Math.log10(1 + w.jobsDone) / 2.5) * 0.85 + (w.verified ? 0.15 : 0);

  // Combinación ponderada.
  const base = quality * 0.5 + proximity * 0.3 + reputation * 0.2;

  // El patrocinio da un empujón acotado (no garantiza el primer puesto).
  return base + (w.sponsored ? 0.35 : 0);
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
