import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { companyMetrics, campaignPerformance } from "@/lib/metrics";
import { benefitsFor } from "@/lib/plans";
import { conversionPct } from "@/lib/ads";
import { Stat, BarChart } from "@/components/charts/Charts";
import { formatMoney } from "@/lib/format";

export default async function CompanyDashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "COMPANY" || !me.companyProfile) redirect("/app");

  const company = await db.companyProfile.findUnique({ where: { userId: me.id } });
  if (!company) redirect("/app");

  // Las estadísticas son un beneficio de plan: sin él, invitamos a mejorarlo.
  const plan = await benefitsFor(company);
  if (!plan.analytics) {
    return (
      <main className="max-w-lg mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold">Métricas</h1>
        <div className="card p-6 mt-5 bg-fg text-bg">
          <p className="font-semibold">Las estadísticas vienen con Business y Enterprise</p>
          <p className="text-sm text-bg/70 mt-1">
            Vas a ver cuántas personas miran tus empleos, cuántas se postulan, a cuántas contratás y cuánto tardás
            en cubrir una vacante.
          </p>
          <Link href="/company/plan" className="btn-secondary w-full mt-4 !bg-bg !text-fg">Ver planes</Link>
        </div>
      </main>
    );
  }

  const m = await companyMetrics(company.id);

  const campaigns = await db.campaign.findMany({ where: { userId: me.id }, take: 30 });
  const ads = await Promise.all(campaigns.map((c) => campaignPerformance(c)));
  const adTotals = campaigns.reduce(
    (acc, c, i) => ({
      invested: acc.invested + c.budget,
      impressions: acc.impressions + c.impressions,
      views: acc.views + c.views,
      requests: acc.requests + ads[i].requests,
      jobs: acc.jobs + ads[i].jobs,
    }),
    { invested: 0, impressions: 0, views: 0, requests: 0, jobs: 0 }
  );

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <h1 className="text-2xl font-bold">Métricas</h1>
      <p className="text-sm text-muted mt-1">Cómo viene tu búsqueda de talento en Better Work.</p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Stat label="Empleos publicados" value={m.offersTotal} hint={`${m.offersActive} activos`} />
        <Stat label="Postulaciones recibidas" value={m.applications} />
        <Stat label="Trabajadores contratados" value={m.hired} />
        <Stat
          label="Tiempo en cubrir vacante"
          value={m.avgDaysToFill == null ? "—" : `${m.avgDaysToFill} ${m.avgDaysToFill === 1 ? "día" : "días"}`}
          hint="Promedio"
        />
        <Stat label="Visitas a tus empleos" value={m.offerViews.toLocaleString("es-AR")} />
        <Stat label="Visitas a tu perfil" value={m.profileViews.toLocaleString("es-AR")} />
      </div>

      <div className="card p-5 mt-3">
        <h2 className="font-semibold text-sm mb-3">Postulaciones por mes</h2>
        <BarChart data={m.applicationsByMonth} />
      </div>

      {/* Rendimiento de la publicidad */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg">Publicidad</h2>
          <Link href="/ads" className="text-sm text-muted hover:text-fg transition">Ver detalle →</Link>
        </div>
        {campaigns.length === 0 ? (
          <Link href="/ads/new" className="card p-4 flex items-center justify-between hover:bg-surface-2 transition">
            <div>
              <p className="text-sm font-medium">📣 Todavía no hiciste campañas</p>
              <p className="text-xs text-muted">Promocioná tu empresa y medí cuántos postulantes trae.</p>
            </div>
            <span className="text-faint">→</span>
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Invertido en publicidad" value={formatMoney(adTotals.invested)} />
            <Stat label="Veces que apareciste" value={adTotals.impressions.toLocaleString("es-AR")} />
            <Stat label="Abrieron tu perfil" value={adTotals.views.toLocaleString("es-AR")} />
            <Stat
              label="Conversión aprox."
              value={`${conversionPct(adTotals.requests, adTotals.views)}%`}
              hint="Postulaciones / visitas"
            />
          </div>
        )}
      </section>
    </main>
  );
}
