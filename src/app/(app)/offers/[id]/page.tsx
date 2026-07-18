import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { applyToOffer } from "@/lib/actions/offers";
import { openConversation } from "@/lib/actions/chat";
import { SponsoredBadge, VerifiedBadge } from "@/components/Badges";
import { formatDate } from "@/lib/format";
import { trackOfferView, trackCompanyProfileView } from "@/lib/track";
import { BackButton } from "@/components/BackButton";

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const offer = await db.jobOffer.findUnique({
    where: { id },
    include: { company: true, category: true, applications: { where: { workerId: me.id } } },
  });
  if (!offer) notFound();

  // Métricas: la visita a la oferta cuenta también como visita a la empresa.
  if (offer.company.userId !== me.id) {
    await trackOfferView(offer.id);
    await trackCompanyProfileView(offer.company.id, offer.company.userId, me.id);
  }

  const applied = offer.applications.length > 0;
  const apply = applyToOffer.bind(null, offer.id);
  const contactCompany = openConversation.bind(null, offer.company.userId);
  const now = new Date();

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <BackButton fallback="/offers" />
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold">{offer.title}</h1>
        {offer.promotedUntil && offer.promotedUntil > now && <SponsoredBadge />}
      </div>
      <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
        {offer.company.companyName} {offer.company.verified && <VerifiedBadge />}
      </p>

      <div className="card divide-y divide-line mt-5">
        <div className="p-4 flex justify-between text-sm"><span className="text-muted">Ubicación</span><span className="font-medium">{offer.city || "—"}</span></div>
        <div className="p-4 flex justify-between text-sm"><span className="text-muted">Modalidad</span><span className="font-medium">{offer.modality}</span></div>
        <div className="p-4 flex justify-between text-sm"><span className="text-muted">Salario</span><span className="font-medium">{offer.salary ?? "A convenir"}</span></div>
        {offer.category && (
          <div className="p-4 flex justify-between text-sm"><span className="text-muted">Categoría</span><span className="font-medium">{offer.category.icon} {offer.category.name}</span></div>
        )}
        <div className="p-4 flex justify-between text-sm"><span className="text-muted">Publicado</span><span className="font-medium">{formatDate(offer.createdAt)}</span></div>
      </div>

      <section className="mt-5">
        <h2 className="font-semibold mb-2">Descripción</h2>
        <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{offer.description}</p>
      </section>

      {me.role === "WORKER" && !applied && (
        <form action={apply} className="card p-5 mt-6 space-y-3">
          <h3 className="font-semibold">Postularme</h3>
          <textarea name="message" className="input min-h-20" placeholder="Presentate brevemente: experiencia, disponibilidad…" />
          <button className="btn-primary w-full !py-3">Enviar postulación</button>
        </form>
      )}
      {me.role === "WORKER" && applied && (
        <div className="card p-5 mt-6 text-center">
          <p className="font-semibold text-sm">✓ Ya te postulaste a esta oferta</p>
          <p className="text-xs text-muted mt-1">La empresa va a revisar tu perfil y contactarte.</p>
        </div>
      )}

      <form action={contactCompany} className="mt-3">
        <button className="btn-secondary w-full">Contactar a la empresa</button>
      </form>
    </main>
  );
}
