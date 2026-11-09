import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { openConversation } from "@/lib/actions/chat";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/Stars";
import { VerifiedBadge, SponsoredBadge, ProBadge } from "@/components/Badges";
import { isPro } from "@/lib/pro";
import { MapView } from "@/components/map/MapView";
import { rankBreakdown } from "@/lib/rank";
import { isSponsored } from "@/lib/ranking";
import { trackWorkerProfileView } from "@/lib/track";
import { ProgressBar } from "@/components/charts/Charts";
import { experienceLabel, radiusLabel, workModeLabel } from "@/lib/worker";
import { formatDate } from "@/lib/format";
import { BackButton } from "@/components/BackButton";
import { Star, Briefcase, Award, Clock3, MessageCircle, ChevronRight, MapPin } from "lucide-react";

export default async function WorkerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();

  const profile = await db.workerProfile.findUnique({
    where: { userId: id },
    include: { user: true, category: true },
  });
  if (!profile || profile.user.suspended) notFound();

  const reviews = await db.review.findMany({
    where: { ratedId: id },
    include: { rater: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const services: string[] = JSON.parse(profile.services || "[]");
  const gallery: string[] = JSON.parse(profile.gallery || "[]");
  const availableDays: string[] = JSON.parse(profile.availableDays || "[]");
  const sponsored = isSponsored(profile.sponsoredUntil);
  const r = rankBreakdown({
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    jobsDone: profile.jobsDone,
    createdAt: profile.createdAt,
    cancellations: profile.cancellations,
    claims: profile.claims,
    avgResponseMins: profile.avgResponseMins,
    punctualityAvg: profile.punctualityAvg,
  });
  const isMe = me?.id === id;

  // Métrica: visita al perfil (no cuenta las propias).
  await trackWorkerProfileView(id, me?.id ?? null);

  const openChat = openConversation.bind(null, id);

  return (
    <main className="w-full animate-fade-up pb-28">
      {/* Portada */}
      <section className="relative h-36 bg-hero overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
        <div className="relative max-w-lg mx-auto px-4 pt-3 [&_*]:!text-white/85">
          <BackButton fallback="/search" />
        </div>
      </section>

      <div className="max-w-lg mx-auto px-4">
        {/* Encabezado */}
        <div className="-mt-14 relative flex items-end gap-4">
          <Avatar name={profile.user.name} url={profile.user.avatarUrl} size={104} ring className="!rounded-[30px] shadow-float" />
          <div className="pb-1 min-w-0 flex flex-wrap gap-1.5">
            {profile.verified && <VerifiedBadge />}
            {isPro(profile.proUntil) && <ProBadge />}
            {sponsored && <SponsoredBadge />}
          </div>
        </div>
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight mt-3">{profile.user.name}</h1>
        <p className="text-muted font-semibold">{profile.profession}</p>
        <div className="flex items-center gap-3 mt-1.5 text-sm flex-wrap">
          {profile.ratingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Stars value={profile.ratingAvg} />
              <span className="font-extrabold">{profile.ratingAvg.toFixed(1)}</span>
              <span className="text-faint">({profile.ratingCount} reseñas)</span>
            </span>
          ) : (
            <span className="badge badge-accent">Nuevo en Manobra</span>
          )}
          {(profile.zone || profile.city) && (
            <span className="inline-flex items-center gap-1 text-muted">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              {profile.zone || profile.city}
            </span>
          )}
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { v: String(profile.jobsDone), l: "Trabajos", icon: Briefcase },
            { v: experienceLabel(profile.experience), l: "Experiencia", icon: Clock3 },
            { v: r.rank, l: "Rango", icon: Award },
          ].map(({ v, l, icon: Icon }) => (
            <div key={l} className="card p-3 text-center">
              <Icon className="w-4 h-4 mx-auto text-accent" aria-hidden />
              <p className="font-extrabold text-sm mt-1.5 truncate">{v}</p>
              <p className="text-[11px] font-semibold text-faint">{l}</p>
            </div>
          ))}
        </div>

        {/* Cómo se calcula el rango */}
        <details className="card p-4 mt-3 group">
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <span className="text-sm font-bold inline-flex items-center gap-1.5">
              <Star className="w-4 h-4 text-gold fill-gold" aria-hidden /> Rango {r.rank} · {r.score}/100
            </span>
            <ChevronRight className="w-4 h-4 text-faint group-open:rotate-90 transition" aria-hidden />
          </summary>
          <div className="mt-4 space-y-2.5">
            {r.parts.map((p) => (
              <ProgressBar key={p.label} label={p.label} value={p.value} max={p.max} />
            ))}
          </div>
          <p className="text-[11px] text-faint mt-3">
            El rango combina calificación, trabajos realizados, puntualidad, tiempo de respuesta y antigüedad.
            Las cancelaciones y los reclamos lo bajan.
          </p>
        </details>

        {/* Acciones: barra fija sobre el menú, siempre a mano */}
        {!isMe && me?.role !== "WORKER" && (
          <div className="fixed inset-x-3 bottom-[92px] z-[950] mx-auto max-w-md glass border border-line/70 rounded-[22px] shadow-float p-2 flex gap-2 animate-pop-in">
            <form action={openChat} className="flex">
              <button className="btn-secondary !px-4 h-full" aria-label="Enviar mensaje">
                <MessageCircle className="w-5 h-5" aria-hidden />
              </button>
            </form>
            <Link href={`/hire/${id}`} className="btn-primary flex-1 !py-3.5 !text-[15px]">
              Contratar a {profile.user.name.split(" ")[0]}
            </Link>
          </div>
        )}
        {!isMe && me?.role === "WORKER" && (
          <form action={openChat} className="mt-5">
            <button className="btn-secondary w-full !py-3">
              <MessageCircle className="w-4 h-4" aria-hidden /> Enviar mensaje
            </button>
          </form>
        )}
        {isMe && (
          <Link href="/worker/profile" className="btn-secondary w-full !py-3 mt-5">Editar mi perfil</Link>
        )}

        {/* Descripción */}
      {profile.bio && (
        <section className="mt-6">
          <h2 className="font-extrabold text-lg tracking-tight mb-2">Sobre mí</h2>
          <p className="text-sm text-muted leading-relaxed">{profile.bio}</p>
        </section>
      )}

      {/* Servicios */}
      {services.length > 0 && (
        <section className="mt-6">
          <h2 className="font-extrabold text-lg tracking-tight mb-2">Servicios</h2>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <span key={s} className="chip !cursor-default">{s}</span>
            ))}
          </div>
        </section>
      )}

      {/* Datos prácticos */}
      <section className="mt-6 card divide-y divide-line">
        {profile.priceHint && (
          <div className="p-4 flex justify-between text-sm"><span className="text-muted">Precios</span><span className="font-medium text-right">{profile.priceHint}</span></div>
        )}
        <div className="p-4 flex justify-between text-sm"><span className="text-muted">Modalidad</span><span className="font-medium text-right">{workModeLabel(profile.workMode)}</span></div>
        {availableDays.length > 0 && (
          <div className="p-4 flex justify-between text-sm"><span className="text-muted">Días</span><span className="font-medium text-right">{availableDays.join(", ")}</span></div>
        )}
        {profile.schedule && (
          <div className="p-4 flex justify-between text-sm"><span className="text-muted">Horarios</span><span className="font-medium text-right">{profile.schedule.replace("-", " a ")}</span></div>
        )}
        {(profile.zone || profile.city) && (
          <div className="p-4 flex justify-between text-sm"><span className="text-muted">Zona</span><span className="font-medium text-right">{[profile.zone, profile.city].filter(Boolean).join(", ")} · {radiusLabel(profile.radiusKm)}</span></div>
        )}
        {profile.whatsapp && !isMe && (
          <div className="p-4 flex justify-between text-sm items-center">
            <span className="text-muted">WhatsApp</span>
            <a
              href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary !py-1.5 !px-3 !text-xs"
            >
              Abrir WhatsApp
            </a>
          </div>
        )}
      </section>

      {/* Galería */}
      <section className="mt-6">
        <h2 className="font-extrabold text-lg tracking-tight mb-2">Trabajos realizados</h2>
        {gallery.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {gallery.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Trabajo ${i + 1}`} loading="lazy" decoding="async" className="aspect-square object-cover rounded-xl border border-line" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-faint">Todavía no cargó fotos de sus trabajos.</p>
        )}
      </section>

      {/* Ubicación */}
      {profile.lat != null && profile.lng != null && (
        <section className="mt-6">
          <h2 className="font-extrabold text-lg tracking-tight mb-2">Ubicación aproximada</h2>
          <div className="h-48 rounded-2xl overflow-hidden border border-line">
            <MapView
              center={[profile.lat, profile.lng]}
              zoom={13}
              markers={[{ id: profile.id, lat: profile.lat, lng: profile.lng, label: profile.user.name, sublabel: profile.profession }]}
            />
          </div>
        </section>
      )}

      {/* Reseñas */}
      <section className="mt-6">
        <h2 className="font-extrabold text-lg tracking-tight mb-2">Reseñas</h2>
        <div className="space-y-2.5">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={r.rater.name} size={28} />
                  <p className="text-sm font-medium">{r.rater.name}</p>
                </div>
                <Stars value={r.stars} size="text-xs" />
              </div>
              {r.comment && <p className="text-sm text-muted mt-2">{r.comment}</p>}
              <p className="text-[11px] text-faint mt-1.5">{formatDate(r.createdAt)}</p>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-faint">Sin reseñas todavía.</p>}
        </div>
      </section>
      </div>
    </main>
  );
}
