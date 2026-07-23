/**
 * Sistema de rangos del trabajador.
 *
 * No depende sólo de las estrellas: combina calificación, cantidad de trabajos,
 * antigüedad, puntualidad y tiempo de respuesta, y penaliza cancelaciones y
 * reclamos. Devuelve un puntaje 0..100 y el rango correspondiente.
 */

export type RankSignals = {
  ratingAvg: number; // 0..5
  ratingCount: number;
  jobsDone: number;
  createdAt: Date; // antigüedad
  cancellations: number;
  claims: number; // denuncias recibidas
  avgResponseMins: number | null; // minutos en responder una solicitud
  punctualityAvg: number; // 0..5
};

export const RANKS = [
  { name: "Principiante", min: 0 },
  { name: "Bronce", min: 25 },
  { name: "Plata", min: 40 },
  { name: "Oro", min: 55 },
  { name: "Platino", min: 70 },
  { name: "Diamante", min: 82 },
  { name: "Elite", min: 92 },
] as const;

export type RankBreakdown = {
  score: number; // 0..100
  rank: string;
  next: string | null;
  toNext: number; // puntos que faltan para el próximo rango
  parts: { label: string; value: number; max: number }[];
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Calificación ponderada por cantidad de reseñas (bayesiana). */
function qualityScore(ratingAvg: number, ratingCount: number): number {
  const C = 8;
  const prior = 3.8;
  return clamp01(((ratingAvg * ratingCount + prior * C) / (ratingCount + C)) / 5);
}

/** Experiencia acumulada: crece rápido al principio y se aplana. */
function volumeScore(jobsDone: number): number {
  return clamp01(Math.log10(1 + jobsDone) / 2.2); // ~160 trabajos ≈ 1
}

/** Antigüedad en la plataforma (12 meses ≈ 1). */
function seniorityScore(createdAt: Date): number {
  const months = (Date.now() - createdAt.getTime()) / (30 * 86_400_000);
  return clamp01(months / 12);
}

/** Tiempo de respuesta: responder en <30 min es 1; a las 24 h cae a 0. */
function responseScore(avgResponseMins: number | null): number {
  if (avgResponseMins == null) return 0.5; // sin datos: neutro
  if (avgResponseMins <= 30) return 1;
  return clamp01(1 - (avgResponseMins - 30) / (24 * 60));
}

function punctualityScore(punctualityAvg: number): number {
  return punctualityAvg > 0 ? clamp01(punctualityAvg / 5) : 0.5; // sin datos: neutro
}

/** Penalización por cancelaciones y reclamos, relativa al volumen. */
function penalty(cancellations: number, claims: number, jobsDone: number): number {
  const base = Math.max(5, jobsDone);
  const cancelRate = clamp01(cancellations / base);
  const claimRate = clamp01(claims / base);
  return clamp01(cancelRate * 0.6 + claimRate * 1.2);
}

/**
 * Un trabajador es "Nuevo" hasta que tenga actividad real: los rangos se ganan
 * completando trabajos y recibiendo calificaciones, no por registrarse.
 */
export function isNewWorker(s: Pick<RankSignals, "jobsDone" | "ratingCount">): boolean {
  return s.jobsDone === 0 && s.ratingCount === 0;
}

export const NEW_RANK = "Nuevo";

export function rankBreakdown(s: RankSignals): RankBreakdown {
  const parts = [
    { label: "Calificación", value: qualityScore(s.ratingAvg, s.ratingCount) * 35, max: 35 },
    { label: "Trabajos realizados", value: volumeScore(s.jobsDone) * 25, max: 25 },
    { label: "Puntualidad", value: punctualityScore(s.punctualityAvg) * 15, max: 15 },
    { label: "Tiempo de respuesta", value: responseScore(s.avgResponseMins) * 15, max: 15 },
    { label: "Antigüedad", value: seniorityScore(s.createdAt) * 10, max: 10 },
  ];

  const raw = parts.reduce((sum, p) => sum + p.value, 0);
  const computed = Math.max(0, Math.round(raw * (1 - penalty(s.cancellations, s.claims, s.jobsDone))));

  // Sin trabajos ni reseñas todavía no hay rango ni puntaje ganado: los valores
  // "neutros" no cuentan hasta tener actividad real.
  const isNew = isNewWorker(s);
  const score = isNew ? 0 : computed;

  let rank: string = NEW_RANK;
  if (!isNew) for (const r of RANKS) if (score >= r.min) rank = r.name;

  const nextRank = RANKS.find((r) => r.min > score) ?? null;

  return {
    score,
    rank,
    next: nextRank?.name ?? null,
    toNext: nextRank ? nextRank.min - score : 0,
    parts: parts.map((p) => ({ ...p, value: isNew ? 0 : Math.round(p.value) })),
  };
}

/** Atajo para listados: sólo el nombre del rango. */
export function computeRank(s: RankSignals): string {
  return rankBreakdown(s).rank;
}
