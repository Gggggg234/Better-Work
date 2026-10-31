/**
 * Origen público del sitio, para URLs absolutas (canonical, sitemap, Open Graph).
 *
 * Si falta `NEXT_PUBLIC_SITE_URL`, en Vercel se usa el dominio de producción
 * que expone la plataforma: así el sitemap nunca publica URLs de `localhost`.
 */
export function siteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3001";
}
