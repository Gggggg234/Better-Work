import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija la raíz del workspace (evita el warning por múltiples lockfiles).
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    serverActions: {
      // Subida de fotos (perfil/galería/feed) vía server actions.
      bodySizeLimit: "20mb",
    },
  },
  // Las imágenes subidas se sirven desde /uploads (o un CDN externo en prod).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
