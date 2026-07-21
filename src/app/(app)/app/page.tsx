import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MapView } from "@/components/map/MapView";
import type { MapMarker } from "@/components/map/Map";
import { WorkerCard } from "@/components/WorkerCard";
import { SponsoredBadge } from "@/components/Badges";
import { workerScore, isSponsored, activeBoost } from "@/lib/ranking";
import { computeRank } from "@/lib/rank";
import { trackSearchAppearances } from "@/lib/track";

const BA_CENTER: [number, number] = [-34.6037, -58.3816];

export default async function AppHome() {
  const user = await getCurrentUser();
  const now = new Date();

  const [categories, workers, companies] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    db.workerProfile.findMany({
      where: { visible: true, lat: { not: null }, user: { suspended: false } },
      // Sólo los campos que usan el ranking, las tarjetas y el mapa: evita
      // traer bio, galería, servicios y demás texto pesado de hasta 80 filas.
      select: {
        id: true,
        userId: true,
        lat: true,
        lng: true,
        profession: true,
        zone: true,
        ratingAvg: true,
        ratingCount: true,
        jobsDone: true,
        verified: true,
        priceHint: true,
        sponsoredUntil: true,
        sponsorBoost: true,
        createdAt: true,
        cancellations: true,
        claims: true,
        avgResponseMins: true,
        punctualityAvg: true,
        user: { select: { name: true, avatarUrl: true } },
      },
      take: 80,
    }),
    // Sólo empresas con membresía activa.
    db.companyProfile.findMany({
      where: { lat: { not: null }, user: { suspended: false }, planActiveUntil: { gt: now } },
      include: { plan: { select: { featuredHome: true, searchBoost: true } } },
      take: 30,
    }),
  ]);

  // Ranking combinado: calidad + reputación + empuje de la campaña activa.
  const sorted = [...workers].sort(
    (a, b) =>
      workerScore({ boost: activeBoost(b.sponsoredUntil, b.sponsorBoost), ratingAvg: b.ratingAvg, ratingCount: b.ratingCount, jobsDone: b.jobsDone, verified: b.verified, distanceKm: null }) -
      workerScore({ boost: activeBoost(a.sponsoredUntil, a.sponsorBoost), ratingAvg: a.ratingAvg, ratingCount: a.ratingCount, jobsDone: a.jobsDone, verified: a.verified, distanceKm: null })
  );
  const shown = sorted.slice(0, 6);

  // Métrica: estos perfiles aparecieron en un listado.
  await trackSearchAppearances(
    shown.map((w) => w.id),
    shown.filter((w) => isSponsored(w.sponsoredUntil)).map((w) => w.userId)
  );

  // Empresas: las del plan con destaque primero, después las patrocinadas.
  const sortedCompanies = [...companies].sort((a, b) => {
    const s = (c: (typeof companies)[number]) =>
      (c.plan?.featuredHome ? 2 : 0) + (isSponsored(c.sponsoredUntil) ? 1 + c.sponsorBoost : 0);
    return s(b) - s(a);
  });

  const markers: MapMarker[] = [
    ...sorted.map((w) => ({
      id: w.id,
      lat: w.lat!,
      lng: w.lng!,
      label: w.user.name,
      sublabel: w.profession,
      href: `/w/${w.userId}`,
      kind: (isSponsored(w.sponsoredUntil) ? "sponsored" : "worker") as MapMarker["kind"],
    })),
    ...sortedCompanies.map((c) => ({
      id: c.id,
      lat: c.lat!,
      lng: c.lng!,
      label: c.companyName,
      sublabel: c.industry,
      kind: "company" as MapMarker["kind"],
    })),
  ];

  return (
    <main className="relative flex-1 flex flex-col">
      {/* Mapa protagonista */}
      <div className="relative h-[52vh] min-h-[320px]">
        <div className="absolute inset-0">
          <MapView center={BA_CENTER} zoom={12} markers={markers} />
        </div>

        {/* Buscador flotante */}
        <div className="absolute top-4 inset-x-4 z-[999]">
          <form action="/search" className="flex items-center gap-2 bg-surface rounded-2xl shadow-lg border border-line px-4 py-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-faint shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              name="q"
              placeholder="¿Qué necesitás? Plomero, profesor, diseñador…"
              className="w-full py-3 text-sm bg-transparent text-fg outline-none placeholder:text-faint"
            />
          </form>

          {/* Categorías */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <Link key={c.id} href={`/search?category=${c.slug}`} className="chip shadow-sm">
                <span>{c.icon}</span> {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Panel inferior */}
      <section className="flex-1 bg-bg rounded-t-3xl -mt-5 z-[500] relative shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 pt-3 pb-6">
        <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4" />

        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Cerca tuyo</h2>
              <Link href="/search" className="text-sm text-muted hover:text-fg transition">Ver todos →</Link>
            </div>
            <div className="space-y-2.5">
              {shown.map((w) => (
                <WorkerCard
                  key={w.id}
                  w={{
                    userId: w.userId,
                    name: w.user.name,
                    avatarUrl: w.user.avatarUrl,
                    profession: w.profession,
                    zone: w.zone,
                    ratingAvg: w.ratingAvg,
                    ratingCount: w.ratingCount,
                    jobsDone: w.jobsDone,
                    verified: w.verified,
                    sponsored: isSponsored(w.sponsoredUntil),
                    priceHint: w.priceHint,
                    rank: computeRank({
                      ratingAvg: w.ratingAvg,
                      ratingCount: w.ratingCount,
                      jobsDone: w.jobsDone,
                      createdAt: w.createdAt,
                      cancellations: w.cancellations,
                      claims: w.claims,
                      avgResponseMins: w.avgResponseMins,
                      punctualityAvg: w.punctualityAvg,
                    }),
                  }}
                />
              ))}
              {shown.length === 0 && (
                <div className="card p-6 text-center text-sm text-faint">
                  Todavía no hay profesionales en el mapa.
                </div>
              )}
            </div>
          </div>

          {sortedCompanies.length > 0 && (
            <div>
              <h2 className="font-bold text-lg mb-3">Empresas en tu zona</h2>
              <div className="space-y-2.5">
                {sortedCompanies.map((c) => (
                  <div key={c.id} className="card p-4 flex items-center gap-3.5">
                    <div className="w-[52px] h-[52px] rounded-xl bg-surface-2 flex items-center justify-center text-xl shrink-0">🏢</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{c.companyName}</p>
                        {isSponsored(c.sponsoredUntil) && <SponsoredBadge />}
                      </div>
                      <p className="text-sm text-muted truncate">{c.industry} · {c.city}</p>
                    </div>
                    <Link href={`/offers?company=${c.id}`} className="btn-secondary shrink-0 !py-1.5 !px-3 !text-xs">
                      Ver ofertas
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user?.role === "WORKER" && (
            <Link href="/dashboard" className="card p-4 flex items-center justify-between hover:bg-surface-2 transition">
              <div>
                <p className="font-semibold text-sm">Mirá tu rendimiento</p>
                <p className="text-xs text-muted">Calificación, rango, visitas y evolución de tus trabajos.</p>
              </div>
              <span className="text-lg">→</span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
