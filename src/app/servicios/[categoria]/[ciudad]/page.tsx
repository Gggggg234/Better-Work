import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrade, capitalize, jsonLd } from "@/lib/seo";
import { siteOrigin } from "@/lib/site";
import { WorkerCard } from "@/components/seo/WorkerCard";
import { Breadcrumbs, HowItWorks, FaqSection, JoinCta } from "@/components/seo/TradeSections";

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ categoria: string; ciudad: string }> };

/**
 * Oficio + ciudad. Sólo existe si hay profesionales listados en esa ciudad:
 * una ciudad sin oferta da 404 en vez de una página vacía.
 */
async function load(params: Props["params"]) {
  const { categoria, ciudad } = await params;
  const trade = await getTrade(categoria);
  if (!trade) return null;
  const city = trade.cities.find((c) => c.slug === ciudad);
  if (!city) return null;
  return { ...trade, city, workers: trade.workers.filter((w) => w.citySlug === city.slug) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { category, copy, city, workers } = data;
  const title = `${capitalize(copy.plural)} en ${city.name}`;
  const description = `${workers.length} ${workers.length === 1 ? copy.singular : copy.plural} en ${city.name}. Pedí presupuesto gratis y elegí con calificaciones reales.`;
  const path = `/servicios/${category.slug}/${city.slug}`;
  return { title, description, alternates: { canonical: path }, openGraph: { title, description, url: path } };
}

export default async function TradeCityPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { category, copy, city, workers, cities } = data;

  const origin = siteOrigin();
  const structured = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Servicios", item: `${origin}/servicios` },
      { "@type": "ListItem", position: 2, name: category.name, item: `${origin}/servicios/${category.slug}` },
      { "@type": "ListItem", position: 3, name: city.name, item: `${origin}/servicios/${category.slug}/${city.slug}` },
    ],
  };
  const nearby = cities.filter((c) => c.slug !== city.slug);

  return (
    <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />

      <section>
        <Breadcrumbs
          items={[
            { href: "/servicios", label: "Servicios" },
            { href: `/servicios/${category.slug}`, label: category.name },
            { label: city.name },
          ]}
        />
        <p className="text-4xl mt-6" aria-hidden><span className="grayscale">{category.icon}</span></p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">
          {capitalize(copy.plural)} en {city.name}
        </h1>
        <p className="text-muted mt-3 max-w-xl">
          {workers.length === 1
            ? `Hay 1 ${copy.singular} en ${city.name} en Manobra.`
            : `Hay ${workers.length} ${copy.plural} en ${city.name} en Manobra.`}{" "}
          Contá qué necesitás, recibí el presupuesto y elegí con calificaciones reales.
        </p>
        <Link href="/register" className="btn-primary !px-6 !py-3 mt-6 inline-flex">Pedir presupuesto gratis</Link>
      </section>

      <section className="space-y-2.5">
        {workers.map((w) => (
          <WorkerCard key={w.id} worker={w} />
        ))}
      </section>

      <HowItWorks />
      <FaqSection faq={copy.faq} />
      <JoinCta singular={copy.singular} place={city.name} />

      {nearby.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">{capitalize(copy.plural)} en otras ciudades</h2>
          <div className="flex flex-wrap gap-2 mt-4">
            {nearby.map((c) => (
              <Link
                key={c.slug}
                href={`/servicios/${category.slug}/${c.slug}`}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm hover:border-fg transition"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
