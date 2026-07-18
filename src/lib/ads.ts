import { db } from "./db";

/**
 * Sistema de publicidad por campañas.
 *
 * El usuario define presupuesto, duración, objetivo y alcance; con eso
 * calculamos (a) una estimación de resultados que se muestra antes de
 * confirmar y (b) el empuje que la campaña le da en los listados.
 *
 * La estimación es una proyección con reglas internas configurables desde el
 * panel Super Admin (no es una promesa: siempre se muestra como rango).
 */

export const OBJECTIVES = [
  { value: "VISIBILITY", label: "Más visibilidad", hint: "Aparecer más veces en listados y mapa", icon: "👁", multiplier: 1.15 },
  { value: "REQUESTS", label: "Más solicitudes", hint: "Priorizar a quien está buscando contratar", icon: "📩", multiplier: 0.85 },
  { value: "REPUTATION", label: "Dar a conocer mi perfil", hint: "Llegar a gente nueva de tu zona", icon: "⭐", multiplier: 1.0 },
] as const;

export const REACHES = [
  { value: "ZONE", label: "Mi zona", hint: "Hasta ~10 km", icon: "📍", multiplier: 0.7 },
  { value: "CITY", label: "Toda la ciudad", hint: "Más gente, algo menos enfocado", icon: "🏙", multiplier: 1.0 },
  { value: "PROVINCE", label: "Toda la provincia", hint: "Máximo alcance", icon: "🗺", multiplier: 1.35 },
] as const;

export type Objective = (typeof OBJECTIVES)[number]["value"];
export type Reach = (typeof REACHES)[number]["value"];

export const BUDGET_PRESETS = [5000, 10000, 20000, 50000];
export const DURATION_PRESETS = [7, 15, 30];

export type AdRules = {
  impressionsPer1000: number; // impresiones estimadas por cada $1.000
  viewRatePct: number; // % de impresiones que abren el perfil
  minBudget: number;
};

const DEFAULTS: AdRules = { impressionsPer1000: 140, viewRatePct: 8, minBudget: 3000 };

export async function getAdRules(): Promise<AdRules> {
  const rows = await db.setting.findMany({
    where: { key: { in: ["ad_impressions_per_1000", "ad_view_rate", "ad_min_budget"] } },
  });
  const m = new Map(rows.map((r) => [r.key, parseFloat(r.value)]));
  const num = (k: string, d: number) => {
    const v = m.get(k);
    return Number.isFinite(v) && (v as number) > 0 ? (v as number) : d;
  };
  return {
    impressionsPer1000: num("ad_impressions_per_1000", DEFAULTS.impressionsPer1000),
    viewRatePct: num("ad_view_rate", DEFAULTS.viewRatePct),
    minBudget: num("ad_min_budget", DEFAULTS.minBudget),
  };
}

export function objectiveMultiplier(o: string): number {
  return OBJECTIVES.find((x) => x.value === o)?.multiplier ?? 1;
}
export function reachMultiplier(r: string): number {
  return REACHES.find((x) => x.value === r)?.multiplier ?? 1;
}
export function objectiveLabel(o: string): string {
  return OBJECTIVES.find((x) => x.value === o)?.label ?? o;
}
export function reachLabel(r: string): string {
  return REACHES.find((x) => x.value === r)?.label ?? r;
}

export type Estimate = {
  dailyBudget: number;
  minImpressions: number;
  maxImpressions: number;
  minViews: number;
  maxViews: number;
  boost: number;
};

/**
 * Proyección de resultados. Pura y determinística: la usan tanto el
 * presupuestador (en el cliente) como el alta de la campaña (en el servidor).
 */
export function estimateCampaign(
  budget: number,
  days: number,
  objective: string,
  reach: string,
  rules: AdRules
): Estimate {
  const safeBudget = Math.max(0, budget);
  const safeDays = Math.max(1, days);
  const base = (safeBudget / 1000) * rules.impressionsPer1000;
  const mid = base * objectiveMultiplier(objective) * reachMultiplier(reach);

  // Rango de ±25% para no prometer un número exacto.
  const minImpressions = Math.round(mid * 0.75);
  const maxImpressions = Math.round(mid * 1.25);
  const rate = rules.viewRatePct / 100;

  return {
    dailyBudget: Math.round(safeBudget / safeDays),
    minImpressions,
    maxImpressions,
    minViews: Math.round(minImpressions * rate),
    maxViews: Math.round(maxImpressions * rate),
    boost: computeBoost(safeBudget / safeDays),
  };
}

/**
 * Empuje en el ranking según la inversión diaria. Es acotado a propósito
 * (máx. 0.45): la publicidad sube posiciones pero no reemplaza la calidad.
 */
export function computeBoost(dailyBudget: number): number {
  const b = Math.log10(1 + Math.max(0, dailyBudget) / 200) / 3; // ~$2.000/día ≈ 0.33
  return Math.min(0.45, Math.round(b * 100) / 100);
}

/** Conversión aproximada: solicitudes / visualizaciones del perfil. */
export function conversionPct(requests: number, views: number): number {
  if (views <= 0) return 0;
  return Math.round((requests / views) * 1000) / 10;
}
