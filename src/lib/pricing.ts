import { db } from "./db";

/**
 * Precios configurables desde el panel Super Admin (viven en la tabla Setting).
 * Un único lugar para el plan de empresa y la publicidad, con defaults.
 */
export const PRICING_DEFAULTS = {
  company_plan_price: 25000,
  promo_price_7: 4000,
  promo_price_15: 7000,
  promo_price_30: 12000,
} as const;

export type PricingKey = keyof typeof PRICING_DEFAULTS;

export const PROMO_DURATIONS = [7, 15, 30] as const;
export type PromoDays = (typeof PROMO_DURATIONS)[number];

const num = (v: string | undefined, fallback: number) => {
  const n = v != null ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

export async function getPricing(): Promise<Record<PricingKey, number>> {
  const rows = await db.setting.findMany({
    where: { key: { in: Object.keys(PRICING_DEFAULTS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<PricingKey, number>;
  for (const key of Object.keys(PRICING_DEFAULTS) as PricingKey[]) {
    out[key] = num(map.get(key), PRICING_DEFAULTS[key]);
  }
  return out;
}

export async function getCompanyPlanPrice(): Promise<number> {
  const s = await db.setting.findUnique({ where: { key: "company_plan_price" } });
  return num(s?.value, PRICING_DEFAULTS.company_plan_price);
}

export async function getPromoPrice(days: PromoDays): Promise<number> {
  const key = `promo_price_${days}` as PricingKey;
  const s = await db.setting.findUnique({ where: { key } });
  return num(s?.value, PRICING_DEFAULTS[key]);
}

export async function savePricing(entries: Partial<Record<PricingKey, number>>): Promise<void> {
  const keys = Object.keys(entries) as PricingKey[];
  await Promise.all(
    keys.map((key) => {
      const value = String(Math.max(0, Math.round(entries[key] ?? 0)));
      return db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    })
  );
}
