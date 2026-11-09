import type { Metadata } from "next";
import Link from "next/link";
import { getTradeIndex } from "@/lib/seo";
import { HowItWorks, JoinCta } from "@/components/seo/TradeSections";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Servicios y oficios cerca tuyo",
  description:
    "Plomeros, electricistas, albañiles, pintores, profesores y más. Pedí presupuesto gratis y elegí con calificaciones reales.",
  alternates: { canonical: "/servicios" },
};

export default async function ServiciosPage() {
  // Se genera en el build: si la base no responde, sale sin la grilla y se
  // completa en la próxima revalidación (1 h) en vez de romper el deploy.
  const trades = await getTradeIndex().catch(() => []);

  return (
    <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-12">
      <section>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Servicios y oficios cerca tuyo</h1>
        <p className="text-muted mt-3 max-w-xl">
          Elegí qué necesitás, pedí presupuesto gratis y compará antes de decidir. Calificaciones reales y
          confirmación del trabajo con códigos.
        </p>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {trades.map((t) => (
          <Link key={t.slug} href={`/servicios/${t.slug}`} className="card p-4 hover:border-fg transition">
            <span className="text-2xl" aria-hidden><span className="grayscale">{t.icon}</span></span>
            <h2 className="font-semibold text-sm mt-2">{t.name}</h2>
            <p className="text-xs text-faint mt-0.5">
              {t.workers > 0 ? `${t.workers} ${t.workers === 1 ? "profesional" : "profesionales"}` : "Sumando profesionales"}
            </p>
          </Link>
        ))}
      </section>

      <HowItWorks />
      <JoinCta singular="profesional" />
    </main>
  );
}
