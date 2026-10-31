import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";
import { getTrade, getTradeIndex } from "@/lib/seo";

// Se regenera cada hora: aparecen solas las ciudades con profesionales nuevos.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteOrigin();
  const now = new Date();
  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  });

  const fixed = [entry("/", 1), entry("/servicios", 0.9), entry("/register", 0.6), entry("/login", 0.4)];

  // Si la base no responde (p. ej. durante el build), se publica lo fijo en vez
  // de romper el deploy.
  try {
    const trades = await getTradeIndex();
    const pages = await Promise.all(
      trades.map(async (t) => {
        const trade = await getTrade(t.slug);
        const cities = trade?.cities ?? [];
        return [entry(`/servicios/${t.slug}`, 0.8), ...cities.map((c) => entry(`/servicios/${t.slug}/${c.slug}`, 0.7))];
      })
    );
    return [...fixed, ...pages.flat()];
  } catch {
    return fixed;
  }
}
