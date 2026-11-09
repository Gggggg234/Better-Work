import { Suspense } from "react";
import Link from "next/link";
import { Search as SearchIcon, SlidersHorizontal, List, Map as MapIcon, SearchX } from "lucide-react";
import { db } from "@/lib/db";
import { WorkerCard } from "@/components/WorkerCard";
import { LocationAutoUpdate } from "@/components/LocationAutoUpdate";
import { ResultsMap } from "@/components/map/ResultsMap";
import type { MapMarker } from "@/components/map/Map";
import { distanceKm } from "@/lib/geo";
import { workerScore, isSponsored, workerBoost } from "@/lib/ranking";
import { isPro } from "@/lib/pro";
import { computeRank } from "@/lib/rank";
import { trackSearchAppearances } from "@/lib/track";

const BA_CENTER = { lat: -34.6037, lng: -58.3816 };

type Search = {
  q?: string;
  category?: string;
  city?: string;
  minRating?: string;
  maxKm?: string;
  minExp?: string;
  verified?: string;
  sort?: string;
  lat?: string;
  lng?: string;
  vista?: string;
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();

  const categories = await db.category.findMany({ where: { active: true }, orderBy: { order: "asc" } });

  const workers = await db.workerProfile.findMany({
    where: {
      visible: true,
      user: { suspended: false },
      ...(sp.category ? { category: { slug: sp.category } } : {}),
      ...(sp.verified === "1" ? { verified: true } : {}),
    },
    include: { user: true, category: true },
  });

  const origin = {
    lat: parseFloat(sp.lat ?? "") || BA_CENTER.lat,
    lng: parseFloat(sp.lng ?? "") || BA_CENTER.lng,
  };

  let results = workers
    .map((w) => ({
      ...w,
      distance: w.lat != null && w.lng != null ? distanceKm(origin.lat, origin.lng, w.lat, w.lng) : null,
      sponsored: isSponsored(w.sponsoredUntil),
    }))
    .filter((w) => {
      if (q) {
        const hay = `${w.user.name} ${w.profession} ${w.category?.name ?? ""} ${w.city} ${w.zone} ${w.bio}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (sp.city && !`${w.city} ${w.zone}`.toLowerCase().includes(sp.city.toLowerCase())) return false;
      if (sp.minRating && w.ratingAvg < parseFloat(sp.minRating)) return false;
      if (sp.minExp && w.experience < parseInt(sp.minExp)) return false;
      if (sp.maxKm && (w.distance == null || w.distance > parseFloat(sp.maxKm))) return false;
      return true;
    });

  // Orden: los filtros explícitos mandan; el default usa el ranking combinado
  // (patrocinio + calidad + cercanía + reputación).
  results = results.sort((a, b) => {
    switch (sp.sort) {
      case "distance":
        return (a.distance ?? 1e9) - (b.distance ?? 1e9);
      case "jobs":
        return b.jobsDone - a.jobsDone;
      case "experience":
        return b.experience - a.experience;
      default:
        return (
          workerScore({ boost: workerBoost(b), ratingAvg: b.ratingAvg, ratingCount: b.ratingCount, jobsDone: b.jobsDone, verified: b.verified, distanceKm: b.distance }) -
          workerScore({ boost: workerBoost(a), ratingAvg: a.ratingAvg, ratingCount: a.ratingCount, jobsDone: a.jobsDone, verified: a.verified, distanceKm: a.distance })
        );
    }
  });

  // Métrica: estos perfiles aparecieron en la búsqueda.
  await trackSearchAppearances(
    results.slice(0, 20).map((w) => w.id),
    results.filter((w) => w.sponsored).map((w) => w.userId)
  );

  const mapView = sp.vista === "mapa";
  // Conserva la búsqueda actual al cambiar de vista o de oficio.
  const withParams = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, String(v));
    return `/search?${p.toString()}`;
  };
  const activeFilters = [sp.city, sp.minRating, sp.maxKm, sp.minExp, sp.sort, sp.verified].filter(Boolean).length;

  const markers: MapMarker[] = results
    .filter((w) => w.lat != null && w.lng != null)
    .map((w) => ({
      id: w.id,
      lat: w.lat!,
      lng: w.lng!,
      label: w.user.name,
      sublabel: w.profession,
      href: `/w/${w.userId}`,
      actionHref: `/hire/${w.userId}`,
      kind: w.sponsored ? "sponsored" : "worker",
      avatarUrl: w.user.avatarUrl,
      rating: w.ratingAvg,
      ratingCount: w.ratingCount,
      pro: isPro(w.proUntil),
      zone: w.zone,
    }));

  const segment = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold transition ${
      active ? "bg-surface shadow-soft text-fg" : "text-muted hover:text-fg"
    }`;

  return (
    <main className="w-full">
      <Suspense fallback={null}>
        <LocationAutoUpdate />
      </Suspense>

      {/* Encabezado con el buscador */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
        <div className="relative max-w-2xl mx-auto px-4 pt-6 pb-16">
          <h1 className="text-[28px] font-extrabold tracking-tight">Encontrá a tu profesional</h1>
          <p className="text-sm text-white/80 mt-1">Perfiles verificados, reseñas reales y precios orientativos.</p>
          <form className="mt-4 flex items-center gap-2 rounded-2xl bg-surface p-1.5 pl-4 shadow-float">
            <SearchIcon className="w-5 h-5 text-accent shrink-0" aria-hidden />
            <input
              name="q"
              defaultValue={sp.q}
              placeholder="Plomero, electricista, nombre…"
              aria-label="Buscar"
              className="w-full bg-transparent text-fg text-[15px] font-medium outline-none placeholder:text-faint py-2"
            />
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            {mapView && <input type="hidden" name="vista" value="mapa" />}
            <button className="btn-primary !py-2.5 !rounded-xl shrink-0">Buscar</button>
          </form>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 -mt-10 relative space-y-4">
        {/* Oficios */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          <Link href={withParams({ category: undefined })} className={`chip shadow-soft ${!sp.category ? "chip-active" : ""}`}>
            Todos
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={withParams({ category: c.slug })}
              className={`chip shadow-soft ${sp.category === c.slug ? "chip-active" : ""}`}
            >
              <span aria-hidden><span className="grayscale">{c.icon}</span></span> {c.name}
            </Link>
          ))}
        </div>

        {/* Filtros avanzados (plegados para no abrumar) */}
        <details className="card group">
          <summary className="list-none cursor-pointer flex items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-2.5 font-bold text-sm">
              <span className="icon-tile w-9 h-9 bg-surface-2 text-fg">
                <SlidersHorizontal className="w-4 h-4" aria-hidden />
              </span>
              Filtros y orden
              {activeFilters > 0 && <span className="badge badge-accent">{activeFilters}</span>}
            </span>
            <span className="text-xs font-bold text-accent group-open:hidden">Mostrar</span>
            <span className="text-xs font-bold text-accent hidden group-open:inline">Ocultar</span>
          </summary>
          <form className="px-4 pb-4 space-y-3 border-t border-line pt-4">
            <input type="hidden" name="q" value={sp.q ?? ""} />
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            {mapView && <input type="hidden" name="vista" value="mapa" />}
            <input name="city" defaultValue={sp.city} placeholder="Ciudad o barrio" className="input" />
            <div className="grid grid-cols-2 gap-2">
              <select name="minRating" defaultValue={sp.minRating ?? ""} className="input" aria-label="Calificación mínima">
                <option value="">Calificación</option>
                <option value="4.5">4.5+ ★</option>
                <option value="4">4.0+ ★</option>
                <option value="3">3.0+ ★</option>
              </select>
              <select name="maxKm" defaultValue={sp.maxKm ?? ""} className="input" aria-label="Distancia máxima">
                <option value="">Distancia</option>
                <option value="2">Hasta 2 km</option>
                <option value="5">Hasta 5 km</option>
                <option value="10">Hasta 10 km</option>
                <option value="30">Hasta 30 km</option>
              </select>
              <select name="minExp" defaultValue={sp.minExp ?? ""} className="input" aria-label="Experiencia mínima">
                <option value="">Experiencia</option>
                <option value="3">3+ años</option>
                <option value="5">5+ años</option>
                <option value="10">10+ años</option>
              </select>
              <select name="sort" defaultValue={sp.sort ?? ""} className="input" aria-label="Ordenar">
                <option value="">Recomendados</option>
                <option value="distance">Más cercanos</option>
                <option value="jobs">Más trabajos</option>
                <option value="experience">Más experiencia</option>
              </select>
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === "1"} className="accent-[var(--accent)] w-4 h-4" />
              Solo profesionales verificados
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={withParams({ city: undefined, minRating: undefined, maxKm: undefined, minExp: undefined, sort: undefined, verified: undefined })}
                className="btn-secondary"
              >
                Limpiar
              </Link>
              <button className="btn-primary">Aplicar</button>
            </div>
          </form>
        </details>

        {/* Cantidad + Lista/Mapa */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted">
            <span className="text-fg font-extrabold">{results.length}</span> {results.length === 1 ? "profesional" : "profesionales"}
          </p>
          <nav className="flex p-1 rounded-2xl bg-surface-2" aria-label="Vista">
            <Link href={withParams({ vista: undefined })} aria-current={!mapView ? "page" : undefined} className={segment(!mapView)}>
              <List className="w-4 h-4" aria-hidden /> Lista
            </Link>
            <Link href={withParams({ vista: "mapa" })} aria-current={mapView ? "page" : undefined} className={segment(mapView)}>
              <MapIcon className="w-4 h-4" aria-hidden /> Mapa
            </Link>
          </nav>
        </div>

        {mapView ? (
          <div className="h-[calc(100dvh-250px)] min-h-[420px] rounded-[26px] overflow-hidden border border-line shadow-float">
            <ResultsMap markers={markers} center={[origin.lat, origin.lng]} />
          </div>
        ) : (
          <div className="space-y-2.5 pb-4">
            {results.map((w) => (
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
                  sponsored: w.sponsored,
                  pro: isPro(w.proUntil),
                  distanceKm: w.distance,
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
            {results.length === 0 && (
              <div className="card p-8 text-center">
                <span className="icon-tile w-14 h-14 bg-surface-2 text-muted mx-auto">
                  <SearchX className="w-7 h-7" aria-hidden />
                </span>
                <p className="font-bold mt-4">No encontramos profesionales</p>
                <p className="text-sm text-muted mt-1">Probá con otro oficio o sacá algún filtro.</p>
                <Link href="/pedidos/nuevo" className="btn-primary mt-4 inline-flex">
                  Publicá tu pedido y te cotizan
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
