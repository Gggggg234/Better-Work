import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Zonas privadas: no indexar.
      disallow: ["/admin", "/api", "/chat", "/jobs", "/payments", "/worker/profile"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
