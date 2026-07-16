import { Suspense } from "react";
import { db } from "@/lib/db";
import { WorkerCard } from "@/components/WorkerCard";
import { LocationAutoUpdate } from "@/components/LocationAutoUpdate";
import { distanceKm } from "@/lib/geo";
import { workerScore } from "@/lib/ranking";

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
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const now = new Date();
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
      sponsored: !!(w.sponsoredUntil && w.sponsoredUntil > now),
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
          workerScore({ sponsored: b.sponsored, ratingAvg: b.ratingAvg, ratingCount: b.ratingCount, jobsDone: b.jobsDone, verified: b.verified, distanceKm: b.distance }) -
          workerScore({ sponsored: a.sponsored, ratingAvg: a.ratingAvg, ratingCount: a.ratingCount, jobsDone: a.jobsDone, verified: a.verified, distanceKm: a.distance })
        );
    }
  });

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <Suspense fallback={null}>
        <LocationAutoUpdate />
      </Suspense>
      <h1 className="text-2xl font-bold">Buscar</h1>

      <form className="mt-4 space-y-3">
        <input name="q" defaultValue={sp.q} placeholder="Profesión, nombre, palabra clave…" className="input" />

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <select name="category" defaultValue={sp.category ?? ""} className="input !w-auto">
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>
            ))}
          </select>
          <input name="city" defaultValue={sp.city} placeholder="Ciudad o barrio" className="input !w-36" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select name="minRating" defaultValue={sp.minRating ?? ""} className="input">
            <option value="">Calificación</option>
            <option value="4.5">4.5+ ★</option>
            <option value="4">4.0+ ★</option>
            <option value="3">3.0+ ★</option>
          </select>
          <select name="maxKm" defaultValue={sp.maxKm ?? ""} className="input">
            <option value="">Distancia</option>
            <option value="2">Hasta 2 km</option>
            <option value="5">Hasta 5 km</option>
            <option value="10">Hasta 10 km</option>
            <option value="30">Hasta 30 km</option>
          </select>
          <select name="minExp" defaultValue={sp.minExp ?? ""} className="input">
            <option value="">Experiencia</option>
            <option value="3">3+ años</option>
            <option value="5">5+ años</option>
            <option value="10">10+ años</option>
          </select>
          <select name="sort" defaultValue={sp.sort ?? ""} className="input">
            <option value="">Mejor calificados</option>
            <option value="distance">Más cercanos</option>
            <option value="jobs">Más trabajos</option>
            <option value="experience">Más experiencia</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === "1"} className="accent-fg w-4 h-4" />
          Solo verificados
        </label>

        <button className="btn-primary w-full">Aplicar filtros</button>
      </form>

      <p className="text-sm text-muted mt-6 mb-3">
        {results.length} {results.length === 1 ? "resultado" : "resultados"}
      </p>

      <div className="space-y-2.5">
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
              distanceKm: w.distance,
              priceHint: w.priceHint,
            }}
          />
        ))}
        {results.length === 0 && (
          <div className="card p-8 text-center text-muted text-sm">
            No encontramos resultados. Probá con otros filtros.
          </div>
        )}
      </div>
    </main>
  );
}
