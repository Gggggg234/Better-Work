import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { promoteWorkerProfile, promoteCompanyProfile } from "@/lib/actions/monetize";
import { getPricing, PROMO_DURATIONS } from "@/lib/pricing";
import { isPlanActive, isSponsored, daysLeft } from "@/lib/company";
import { formatMoney, formatDate } from "@/lib/format";

export default async function PromotePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "WORKER" && me.role !== "COMPANY") redirect("/app");
  const sp = await searchParams;

  const pricing = await getPricing();
  const priceByDays: Record<number, number> = {
    7: pricing.promo_price_7,
    15: pricing.promo_price_15,
    30: pricing.promo_price_30,
  };

  let sponsoredUntil: Date | null = null;
  let planBlocked = false;
  if (me.role === "WORKER") {
    const p = await db.workerProfile.findUnique({ where: { userId: me.id } });
    sponsoredUntil = p?.sponsoredUntil ?? null;
  } else {
    const c = await db.companyProfile.findUnique({ where: { userId: me.id } });
    sponsoredUntil = c?.sponsoredUntil ?? null;
    planBlocked = !isPlanActive(c?.planActiveUntil);
  }
  const action = me.role === "WORKER" ? promoteWorkerProfile : promoteCompanyProfile;
  const active = isSponsored(sponsoredUntil);
  const left = daysLeft(sponsoredUntil);

  if (planBlocked) {
    return (
      <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
        <h1 className="text-2xl font-bold">Destacar</h1>
        <div className="card p-5 mt-5 bg-fg text-bg">
          <p className="font-semibold">Necesitás un plan Premium activo</p>
          <p className="text-sm text-bg/70 mt-1">Activá el plan de empresa para poder promocionar tu perfil.</p>
          <a href="/company/plan" className="btn-secondary w-full mt-4 !bg-bg !text-fg">Ver plan</a>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Destacá tu perfil</h1>
      <p className="text-sm text-muted mt-1">
        Aparecé primero en los listados y el mapa, con la insignia “Patrocinado”. La publicidad suma visibilidad;
        la posición final igual considera calificación, cercanía y reputación.
      </p>

      {sp.ok && (
        <div className="card p-4 mt-5 border-fg bg-surface-2">
          <p className="text-sm font-medium">✓ ¡Listo! Tu perfil ya está destacado.</p>
        </div>
      )}
      {active && (
        <div className="card p-4 mt-5">
          <p className="text-sm font-medium">Ya estás destacado ★</p>
          <p className="text-xs text-muted mt-0.5">Hasta el {formatDate(sponsoredUntil!)}{left != null && ` · ${left} días`}. Comprá más días para extenderlo.</p>
        </div>
      )}

      <div className="space-y-3 mt-6">
        {PROMO_DURATIONS.map((days) => (
          <form key={days} action={action} className="card p-5 flex items-center justify-between">
            <input type="hidden" name="days" value={days} />
            <div>
              <p className="font-semibold">{days} días destacado</p>
              <p className="text-xs text-muted">
                {(priceByDays[days] / days).toFixed(0) !== "Infinity" ? `${formatMoney(Math.round(priceByDays[days] / days))} por día` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatMoney(priceByDays[days])}</p>
              <button className="btn-primary mt-1.5 !py-1.5 !px-3 !text-xs">Destacar</button>
            </div>
          </form>
        ))}
      </div>

      {sp.error === "pago" && <p className="text-sm text-red-600 mt-3 text-center">No pudimos procesar el pago.</p>}

      <div className="card p-4 mt-6 text-xs text-muted space-y-1">
        <p className="font-medium text-fg">Beneficios de destacarte</p>
        <p>✓ Aparecés antes en búsquedas y sugerencias</p>
        <p>✓ Insignia “Patrocinado” en tu perfil</p>
        <p>✓ Mayor presencia en el mapa</p>
      </div>
    </main>
  );
}
