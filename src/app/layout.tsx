import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { siteOrigin } from "@/lib/site";

// Plus Jakarta Sans: geométrica y cálida, con más carácter que una grotesca neutra.
const sans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Manobra — Encontrá al profesional indicado",
    template: "%s · Manobra",
  },
  description: "Conectá con trabajadores y empresas cerca tuyo. Simple, rápido y confiable.",
  openGraph: {
    title: "Manobra",
    description: "Encontrá al profesional indicado, cerca tuyo.",
    type: "website",
    images: ["/icon-512.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: { capable: true, title: "Manobra", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // El contenido llega hasta los bordes (notch y barra de gestos); los márgenes los dan los safe-area.
  viewportFit: "cover",
};

// Aplica el tema guardado antes de pintar, para evitar parpadeo (FOUC).
const themeInit = `(function(){try{var t=localStorage.getItem('bw-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${sans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
