import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MapView } from "@/components/map/MapView";
import type { MapMarker } from "@/components/map/Map";
import { WorkerCard } from "@/components/WorkerCard";
import { SponsoredBadge } from "@/components/Badges";
import { workerScore, isSponsored, workerBoost } from "@/lib/ranking";
import { isPro } from "@/lib/pro";
import { computeRank } from "@/lib/rank";
import { trackSearchAppearances } from "@/lib/track";
import { openRequestsFor } from "@/lib/openRequests";
import { aiConfigured } from "@/lib/ai/requestAssistant";
import { escrowActive } from "@/lib/payments";
import { formatDate } from "@/lib/format";
import { vapidPublicKey } from "@/lib/notify";
import { PushToggle } from "@/components/PushToggle";
import { redirect } from "next/navigation";
import {
  Search,
  ClipboardList,
  Briefcase,
  Package,
  Pencil,
  Building2,
  Sparkles,
  BarChart3,
  Gift,
  Users,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import { QuickAction, ActionRow, SectionTitle, IconTile } from "@/components/ui/ActionCards";

const BA_CENTER: [number, number] = [-34.6037, -58.3816];

export default async function AppHome() {
  const user = await getCurrentUser();
  // El proveedor tiene su propio panel como inicio.
  if (user?.role === "SUPPLIER") redirect("/proveedor");
  const now = new Date();
  const [escrow, pushKey] = await Promise.all([escrowActive(), vapidPublicKey().catch(() => "")]);

  // Pedidos abiertos que puede cotizar (sólo para profesionales).
  const nearbyRequests =
    user?.role === "WORKER" && user.workerProfile ? (await openRequestsFor(user.workerProfile)).filter((r) => !r.myBid) : [];

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
        proUntil: true,
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
      workerScore({ boost: workerBoost(b), ratingAvg: b.ratingAvg, ratingCount: b.ratingCount, jobsDone: b.jobsDone, verified: b.verified, distanceKm: null }) -
      workerScore({ boost: workerBoost(a), ratingAvg: a.ratingAvg, ratingCount: a.ratingCount, jobsDone: a.jobsDone, verified: a.verified, distanceKm: null })
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

  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";
  const workerPro = isPro(user?.workerProfile?.proUntil);

  return (
    <main className="relative flex-1 flex flex-col">
      {/* Mapa con buscador flotante */}
      <div className="relative h-[38vh] min-h-[260px]">
        <div className="absolute inset-0">
          <MapView center={BA_CENTER} zoom={12} markers={markers} locate />
        </div>

        <div className="absolute top-3 inset-x-3 z-[999]">
          <form action="/search" className="flex items-center gap-2.5 bg-surface rounded-2xl shadow-lg border border-line px-4">
            <Search className="w-[18px] h-[18px] text-faint shrink-0" aria-hidden />
            <input
              name="q"
              placeholder="¿Qué necesitás? Plomero, electricista…"
              aria-label="Buscar profesionales"
              className="w-full py-3.5 text-sm bg-transparent text-fg outline-none placeholder:text-faint"
            />
          </form>

          {/* Oficios: un toque y busca */}
          <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <Link key={c.id} href={`/search?category=${c.slug}`} className="chip shadow-sm !py-1.5">
                <span aria-hidden>{c.icon}</span> {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Panel */}
      <section className="flex-1 bg-bg rounded-t-3xl -mt-5 z-[500] relative shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 pt-5 pb-8">
        <div className="max-w-lg mx-auto space-y-7">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hola{firstName ? `, ${firstName}` : ""} 👋</h1>
            <p className="text-sm text-muted mt-0.5">
              {user?.role === "WORKER" ? "Esto es lo que podés hacer hoy." : "¿Qué necesitás hoy?"}
            </p>
          </div>

          {/* Accesos rápidos: qué es cada cosa y para qué sirve */}
          <div className="grid grid-cols-2 gap-3">
            {user?.role === "WORKER" ? (
              <>
                <QuickAction
                  href="/pedidos"
                  icon={ClipboardList}
                  title="Pedidos cerca"
                  desc={nearbyRequests.length > 0 ? "Clientes esperando tu presupuesto" : "Clientes de tu zona buscando tu oficio"}
                  tone="warning"
                  badge={nearbyRequests.length}
                />
                <QuickAction href="/jobs" icon={Briefcase} title="Mis trabajos" desc="Solicitudes, presupuestos y trabajos en curso" tone="accent" />
                <QuickAction href="/materiales" icon={Package} title="Materiales" desc="Comprá lo que necesitás para tus trabajos" tone="success" />
                <QuickAction href="/worker/profile" icon={Pencil} title="Mi perfil" desc="Un perfil completo consigue más trabajos" tone="neutral" />
              </>
            ) : (
              <>
                <QuickAction href="/search" icon={Search} title="Buscar profesional" desc="Perfiles, precios y reseñas reales" tone="accent" />
                <QuickAction
                  href="/pedidos/nuevo"
                  icon={ClipboardList}
                  title="Pedir presupuestos"
                  desc={aiConfigured() ? "Sacá una foto y te cotizan varios" : "Publicá y te cotizan varios profesionales"}
                  tone="warning"
                />
                <QuickAction href="/materiales" icon={Package} title="Materiales" desc="Corralones y ferreterías cerca tuyo" tone="success" />
                {user?.role === "COMPANY" ? (
                  <QuickAction href="/company" icon={Building2} title="Mi empresa" desc="Empleos, postulantes y membresía" tone="neutral" />
                ) : (
                  <QuickAction href="/jobs" icon={Briefcase} title="Mis trabajos" desc="Seguí lo que contrataste, paso a paso" tone="neutral" />
                )}
              </>
            )}
          </div>

          {pushKey && user && <PushToggle publicKey={pushKey} compact />}

          {/* Para el profesional: Pro, rendimiento e invitaciones */}
          {user?.role === "WORKER" && (
            <div className="space-y-2.5">
              <ActionRow
                href="/pro"
                icon={Sparkles}
                tone="accent"
                highlight={!workerPro}
                title={workerPro ? `Sos Pro hasta el ${formatDate(user.workerProfile!.proUntil!)}` : "Pasate a Better Work Pro"}
                desc={workerPro ? "Aparecés más arriba y mandás presupuestos sin límite." : "Aparecé más arriba y mandá presupuestos sin límite."}
              />
              <ActionRow href="/dashboard" icon={BarChart3} title="Mi rendimiento" desc="Calificación, rango, visitas y evolución." />
              <ActionRow
                href="/invitar"
                icon={Gift}
                tone="success"
                title="Invitá y ganá"
                desc={escrow ? "Por cada colega que se sume y trabaje, ganás 2 trabajos sin comisión." : "Por cada colega o cliente que trabaje, ganás 30 días de Pro."}
              />
            </div>
          )}
          {user && user.role !== "WORKER" && user.role !== "ADMIN" && escrow && (
            <ActionRow
              href="/invitar"
              icon={Gift}
              tone="success"
              title={user.freeJobs > 0 ? `Tenés ${user.freeJobs} ${user.freeJobs === 1 ? "trabajo bonificado" : "trabajos bonificados"}` : "Invitá y ganá"}
              desc="Por cada amigo que se sume y contrate, ganás 2 trabajos sin tarifa de servicio."
            />
          )}

          <div>
            <SectionTitle title="Profesionales cerca tuyo" href="/search" linkLabel="Ver todos" />
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
                    pro: isPro(w.proUntil),
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
                <div className="card p-6 text-center text-sm text-muted">Todavía no hay profesionales en el mapa.</div>
              )}
            </div>
          </div>

          {sortedCompanies.length > 0 && (
            <div>
              <SectionTitle title="Empresas en tu zona" href="/offers" linkLabel="Ver empleos" />
              <div className="space-y-2.5">
                {sortedCompanies.map((c) => (
                  <div key={c.id} className="card p-4 flex items-center gap-3.5">
                    <IconTile icon={Building2} tone="neutral" />
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

          {/* Más secciones (salieron del menú inferior para que sea más simple) */}
          <div>
            <SectionTitle title="Más en Better Work" />
            <div className="flex flex-wrap gap-2">
              <Link href="/feed" className="chip"><Users className="w-4 h-4" aria-hidden /> Comunidad</Link>
              {user?.role === "WORKER" && (
                <Link href="/offers" className="chip"><Megaphone className="w-4 h-4" aria-hidden /> Empleos</Link>
              )}
              <Link href="/pedidos" className="chip">
                <ClipboardList className="w-4 h-4" aria-hidden /> {user?.role === "WORKER" ? "Mis presupuestos" : "Mis pedidos"}
              </Link>
              <Link href="/chat" className="chip"><MessageCircle className="w-4 h-4" aria-hidden /> Mensajes</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
