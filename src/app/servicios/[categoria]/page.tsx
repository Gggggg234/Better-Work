import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrade, getTradeIndex, capitalize, jsonLd } from "@/lib/seo";
import { siteOrigin } from "@/lib/site";
import { WorkerCard } from "@/components/seo/WorkerCard";
import { Breadcrumbs, HowItWorks, FaqSection, JoinCta } from "@/components/seo/TradeSections";

// Se genera en la primera visita y se refresca cada hora (ISR): no depende de
// la base durante el build.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ categoria: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trade = await getTrade((await params).categoria);
  if (!trade) return {};
  const { category, copy } = trade;
  const title = `${capitalize(copy.plural)} cerca tuyo: pedí presupuesto`;
  return {
    title,
    description: copy.intro,
    alternates: { canonical: `/servicios/${category.slug}` },
    openGraph: { title, description: copy.intro, url: `/servicios/${category.slug}` },
  };
}

export default async function TradePage({ params }: Props) {
  const trade = await getTrade((await params).categoria);
  if (!trade) notFound();
  const { category, workers, cities, copy } = trade;

  const others = (await getTradeIndex()).filter((c) => c.slug !== category.slug);
  const origin = siteOrigin();
  const url = `${origin}/servicios/${category.slug}`;

  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Servicios", item: `${origin}/servicios` },
        { "@type": "ListItem", position: 2, name: category.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${category.name} — ${capitalize(copy.plural)}`,
      serviceType: category.name,
      description: copy.intro,
      url,
      areaServed: { "@type": "Country", name: "Argentina" },
      provider: { "@type": "Organization", name: "Manobra", url: origin },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: copy.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />

      <section>
        <Breadcrumbs items={[{ href: "/servicios", label: "Servicios" }, { label: category.name }]} />
        <p className="text-4xl mt-6" aria-hidden><span className="grayscale">{category.icon}</span></p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">{capitalize(copy.plural)} cerca tuyo</h1>
        <p className="text-muted mt-3 max-w-xl">{copy.intro}</p>
        <div className="flex flex-wrap gap-2 mt-6">
          <Link href="/register" className="btn-primary !px-6 !py-3">Pedir presupuesto gratis</Link>
          <Link href="/register?rol=trabajador" className="btn-secondary !px-6 !py-3">
            Soy {copy.singular}
          </Link>
        </div>
      </section>

      {/* Profesionales listados */}
      <section>
        <h2 className="text-lg font-bold">
          {workers.length > 0 ? `${capitalize(copy.plural)} en Manobra` : `Sumando ${copy.plural}`}
        </h2>
        {workers.length > 0 ? (
          <div className="space-y-2.5 mt-4">
            {workers.slice(0, 12).map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted mt-2">
            Todavía estamos sumando {copy.plural} a la plataforma. Si sos uno, sumate gratis y sé de los primeros en
            recibir pedidos de tu zona.
          </p>
        )}
      </section>

      {cities.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">{capitalize(copy.plural)} por ciudad</h2>
          <div className="flex flex-wrap gap-2 mt-4">
            {cities.map((c) => (
              <Link
                key={c.slug}
                href={`/servicios/${category.slug}/${c.slug}`}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm hover:border-fg transition"
              >
                {c.name} <span className="text-faint">({c.count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {copy.tasks.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Trabajos que podés pedir</h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-4">
            {copy.tasks.map((t) => (
              <li key={t} className="flex gap-2 text-sm">
                <span className="text-fg">✓</span>
                <span className="text-muted">{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <HowItWorks />
      <FaqSection faq={copy.faq} />
      <JoinCta singular={copy.singular} />

      {others.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Otros servicios</h2>
          <div className="flex flex-wrap gap-2 mt-4">
            {others.map((c) => (
              <Link
                key={c.slug}
                href={`/servicios/${c.slug}`}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm hover:border-fg transition"
              >
                <span className="grayscale">{c.icon}</span> {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
