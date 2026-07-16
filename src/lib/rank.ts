export type Rank = {
  name: string;
  minJobs: number;
  minRating: number;
};

// Rangos ordenados de mayor a menor exigencia.
const RANKS: Rank[] = [
  { name: "Elite", minJobs: 200, minRating: 4.8 },
  { name: "Diamante", minJobs: 120, minRating: 4.7 },
  { name: "Platino", minJobs: 70, minRating: 4.5 },
  { name: "Oro", minJobs: 40, minRating: 4.3 },
  { name: "Plata", minJobs: 15, minRating: 4.0 },
  { name: "Bronce", minJobs: 5, minRating: 3.5 },
  { name: "Principiante", minJobs: 0, minRating: 0 },
];

/**
 * Calcula el rango de un trabajador. Las cancelaciones penalizan
 * restando trabajos efectivos (cada cancelación descuenta 2).
 */
export function computeRank(jobsDone: number, ratingAvg: number, cancellations = 0): string {
  const effective = Math.max(0, jobsDone - cancellations * 2);
  for (const r of RANKS) {
    if (effective >= r.minJobs && (ratingAvg >= r.minRating || r.minRating === 0)) {
      return r.name;
    }
  }
  return "Principiante";
}

export function rankProgress(jobsDone: number): { current: string; next: string | null; pct: number } {
  const sorted = [...RANKS].reverse(); // menor a mayor
  let currentIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (jobsDone >= sorted[i].minJobs) currentIdx = i;
  }
  const next = sorted[currentIdx + 1] ?? null;
  const base = sorted[currentIdx].minJobs;
  const pct = next ? Math.min(100, Math.round(((jobsDone - base) / (next.minJobs - base)) * 100)) : 100;
  return { current: sorted[currentIdx].name, next: next?.name ?? null, pct };
}
