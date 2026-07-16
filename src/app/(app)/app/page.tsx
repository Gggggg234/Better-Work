import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MapView } from "@/components/map/MapView";
import type { MapMarker } from "@/components/map/Map";
import { WorkerCard } from "@/components/WorkerCard";
import { SponsoredBadge } from "@/components/Badges";
import { workerScore } from "@/lib/ranking";
import { isSponsored } from "@/lib/company";

const BA_CENTER: [number, number] = [-34.6037, -58.3816];

export default async function AppHome() {
  const user = await getCurrentUser();
  const now = new Date();

  const [categories, workers, companies] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    db.workerProfile.findMany({
      where: { visible: true, lat: { not: null }, user: { suspended: false } },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      take: 80,
    }),
    // Empresas Premium: solo aparecen con plan activo.
    db.companyProfile.findMany({
      where: { lat: { not: null }, user: { suspended: false }, planActiveUntil: { gt: now } },
      orderBy: [{ sponsoredUntil: "desc" }],
      take: 30,
    }),
  ]);

  // Ranking combinado: patrocinio + calificación + reputación (sin cercanía en
  // el home porque no tenemos la ubicación del usuario del lado del servidor).
  const sorted = [...workers].sort(
    (a, b) =>
      workerScore({ sponsored: isSponsored(b.sponsoredUntil), ratingAvg: b.ratingAvg, ratingCount: b.ratingCount, jobsDone: b.jobsDone, verified: b.verified, distanceKm: null }) -
      workerScore({ sponsored: isSponsored(a.sponsoredUntil), ratingAvg: a.ratingAvg, ratingCount: a.ratingCount, jobsDone: a.jobsDone, verified: a.verified, distanceKm: null })
  );

  const markers: MapMarker[] = [
    ...sorted.map((w) => ({
      id: w.id,
      lat: w.lat!,
      lng: w.lng!,
      label: w.user.name,
      sublabel: w.profession,
      href: `/w/${w.userId}`,
      kind: (w.sponsoredUntil && w.sponsoredUntil > now ? "sponsored" : "worker") as MapMarker["kind"],
    })),
    ...companies.map((c) => ({
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
              {sorted.slice(0, 6).map((w) => (
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
                    cancellations: w.cancellations,
                    verified: w.verified,
                    sponsored: !!(w.sponsoredUntil && w.sponsoredUntil > now),
                    priceHint: w.priceHint,
                  }}
                />
              ))}
            </div>
          </div>

          {companies.length > 0 && (
            <div>
              <h2 className="font-bold text-lg mb-3">Empresas en tu zona</h2>
              <div className="space-y-2.5">
                {companies.map((c) => (
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
            <Link href="/worker/profile" className="card p-4 flex items-center justify-between hover:shadow-md transition">
              <div>
                <p className="font-semibold text-sm">Completá tu perfil profesional</p>
                <p className="text-xs text-muted">Aparecé en el mapa y recibí más trabajos.</p>
              </div>
              <span className="text-lg">→</span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
