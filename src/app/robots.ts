import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Zonas privadas: no indexar.
      disallow: ["/admin", "/api", "/chat", "/jobs", "/ads", "/dashboard", "/worker/profile", "/pedidos"],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
