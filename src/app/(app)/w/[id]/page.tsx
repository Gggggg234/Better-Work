import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { openConversation } from "@/lib/actions/chat";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/Stars";
import { VerifiedBadge, SponsoredBadge } from "@/components/Badges";
import { MapView } from "@/components/map/MapView";
import { computeRank } from "@/lib/rank";
import { experienceLabel, radiusLabel, workModeLabel } from "@/lib/worker";
import { formatDate } from "@/lib/format";

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
  const payMethods: string[] = JSON.parse(profile.payMethods || "[]");
  const availableDays: string[] = JSON.parse(profile.availableDays || "[]");
  const now = new Date();
  const sponsored = !!(profile.sponsoredUntil && profile.sponsoredUntil > now);
  const rank = computeRank(profile.jobsDone, profile.ratingAvg, profile.cancellations);
  const isMe = me?.id === id;

  const openChat = openConversation.bind(null, id);

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      {/* Encabezado */}
      <div className="flex items-start gap-4">
        <Avatar name={profile.user.name} url={profile.user.avatarUrl} size={72} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{profile.user.name}</h1>
            {profile.verified && <VerifiedBadge />}
            {sponsored && <SponsoredBadge />}
          </div>
          <p className="text-muted">{profile.profession}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted flex-wrap">
            <Stars value={profile.ratingAvg} />
            <span className="font-medium">{profile.ratingAvg.toFixed(1)}</span>
            <span className="text-faint">({profile.ratingCount} reseñas)</span>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 mt-5">
        {[
          [String(profile.jobsDone), "Trabajos"],
          [experienceLabel(profile.experience), "Experiencia"],
          [rank, "Rango"],
        ].map(([v, l]) => (
          <div key={l} className="card p-3 text-center">
            <p className="font-bold text-sm">{v}</p>
            <p className="text-[11px] text-faint mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Acciones */}
      {!isMe && me?.role !== "WORKER" && (
        <div className="flex gap-2 mt-5 sticky top-3 z-[600]">
          <Link href={`/hire/${id}`} className="btn-primary flex-1 !py-3 shadow-lg">Contratar</Link>
          <form action={openChat} className="flex-1 flex">
            <button className="btn-secondary flex-1 !py-3 shadow-lg">Mensaje</button>
          </form>
        </div>
      )}
      {!isMe && me?.role === "WORKER" && (
        <form action={openChat} className="mt-5">
          <button className="btn-secondary w-full !py-3">Enviar mensaje</button>
        </form>
      )}
      {isMe && (
        <Link href="/worker/profile" className="btn-secondary w-full !py-3 mt-5">Editar mi perfil</Link>
      )}

      {/* Descripción */}
      {profile.bio && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Sobre mí</h2>
          <p className="text-sm text-muted leading-relaxed">{profile.bio}</p>
        </section>
      )}

      {/* Servicios */}
      {services.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Servicios</h2>
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
        {payMethods.length > 0 && (
          <div className="p-4 flex justify-between text-sm"><span className="text-muted">Cobra por</span><span className="font-medium text-right">{payMethods.join(", ")}</span></div>
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
        <h2 className="font-semibold mb-2">Trabajos realizados</h2>
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
          <h2 className="font-semibold mb-2">Ubicación aproximada</h2>
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
        <h2 className="font-semibold mb-2">Reseñas</h2>
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
    </main>
  );
}
