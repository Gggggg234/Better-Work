import { db } from "@/lib/db";

/**
 * Rango de precio de un oficio a partir de presupuestos REALES de Better Work
 * (cotizaciones a pedidos abiertos y precios de trabajos aceptados).
 *
 * No lo estima la IA a propósito: con la inflación, cualquier precio que un
 * modelo "recuerde" está desactualizado. Con pocos datos no se muestra nada.
 */

/** Ventana corta: los precios en pesos se desactualizan rápido. */
const WINDOW_DAYS = 90;
/** Menos que esto no es un rango, es una anécdota. */
export const MIN_SAMPLES = 5;

export type PriceRange = { low: number; mid: number; high: number; count: number };

/** Percentil con interpolación lineal sobre una lista ordenada. */
function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Redondeo amable para mostrar: a $500 (o $100 si el monto es chico). */
function round(n: number): number {
  const step = n < 5000 ? 100 : 500;
  return Math.round(n / step) * step;
}

export async function priceRangeFor(categoryId: string): Promise<PriceRange | null> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

  const [bids, jobs] = await Promise.all([
    db.bid.findMany({
      where: { createdAt: { gte: since }, status: { not: "WITHDRAWN" }, request: { categoryId } },
      select: { price: true },
    }),
    db.job.findMany({
      where: {
        acceptedAt: { gte: since },
        price: { gt: 0 },
        status: { in: ["ACCEPTED", "EN_ROUTE", "WORKING", "COMPLETED"] },
        worker: { workerProfile: { categoryId } },
        // Un trabajo que nació de un pedido abierto ya cuenta por su cotización.
        openRequest: null,
      },
      select: { price: true },
    }),
  ]);

  const prices = [...bids.map((b) => b.price), ...jobs.map((j) => j.price ?? 0)]
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  if (prices.length < MIN_SAMPLES) return null;

  return {
    low: round(quantile(prices, 0.25)),
    mid: round(quantile(prices, 0.5)),
    high: round(quantile(prices, 0.75)),
    count: prices.length,
  };
}
