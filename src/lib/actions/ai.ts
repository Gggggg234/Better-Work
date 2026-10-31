"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { aiConfigured, suggestRequest, type AiImage } from "@/lib/ai/requestAssistant";
import { priceRangeFor, type PriceRange } from "@/lib/priceStats";

/** Análisis por persona por día: cada uno cuesta plata. */
const DAILY_LIMIT = 10;
const MAX_IMAGES = 3;
/** Las fotos llegan achicadas desde el navegador; esto es sólo un tope. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AnalyzeResult =
  | {
      ok: true;
      categoryId: string | null;
      categoryName: string | null;
      title: string;
      description: string;
      urgent: boolean;
      safetyWarning: string;
      missingInfo: string[];
      price: PriceRange | null;
    }
  | { ok: false; error: string };

/** Analiza las fotos de un pedido y sugiere oficio, título y descripción. */
export async function analyzeRequestPhotos(formData: FormData): Promise<AnalyzeResult> {
  const user = await requireUser();
  if (!aiConfigured()) return { ok: false, error: "La IA todavía no está activada." };

  const since = new Date(Date.now() - 86_400_000);
  const used = await db.aiAnalysis.count({ where: { userId: user.id, createdAt: { gte: since } } });
  if (used >= DAILY_LIMIT) {
    return { ok: false, error: `Llegaste al límite de ${DAILY_LIMIT} análisis por día. Podés completar el pedido a mano.` };
  }

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_IMAGES);
  const images: AiImage[] = [];
  for (const f of files) {
    const type = IMAGE_TYPES.find((t) => t === f.type);
    if (!type || f.size > MAX_IMAGE_BYTES) continue;
    images.push({ mediaType: type, data: Buffer.from(await f.arrayBuffer()).toString("base64") });
  }
  if (images.length === 0) return { ok: false, error: "Subí al menos una foto (JPG, PNG o WEBP)." };

  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, slug: true, name: true },
  });

  // Se registra antes de llamar: un intento fallido también cuenta para el límite.
  const log = await db.aiAnalysis.create({ data: { userId: user.id } });

  const result = await suggestRequest({
    images,
    text: String(formData.get("text") ?? ""),
    categories,
  });
  if (!result.ok) return result;

  const s = result.suggestion;
  const category = categories.find((c) => c.slug === s.categorySlug) ?? null;
  const [price] = await Promise.all([
    category ? priceRangeFor(category.id) : Promise.resolve(null),
    db.aiAnalysis.update({ where: { id: log.id }, data: { ok: true, categorySlug: category?.slug ?? null } }),
  ]);

  return {
    ok: true,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    title: s.title,
    description: s.description,
    urgent: s.urgent,
    safetyWarning: s.safetyWarning,
    missingInfo: s.missingInfo,
    price,
  };
}
