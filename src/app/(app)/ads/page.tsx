import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cancelCampaign } from "@/lib/actions/monetize";
import { campaignPerformance } from "@/lib/metrics";
import { closeExpiredCampaigns } from "@/lib/track";
import { objectiveLabel, reachLabel, conversionPct } from "@/lib/ads";
import { Stat, BarChart } from "@/components/charts/Charts";
import { formatMoney, formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  FINISHED: "Finalizada",
  CANCELLED: "Cancelada",
};

export default async function AdsDashboardPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "WORKER" && me.role !== "COMPANY") redirect("/app");
  const sp = await searchParams;

  await closeExpiredCampaigns(me.id);

  const campaigns = await db.campaign.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Los días restantes se calculan acá (el render debe ser puro).
  const now = new Date().getTime();
  const withPerf = await Promise.all(
    campaigns.map(async (c) => ({
      campaign: c,
      perf: await campaignPerformance(c),
      daysLeft: Math.max(0, Math.ceil((c.endsAt.getTime() - now) / 86_400_000)),
    }))
  );

  const active = withPerf.filter((c) => c.campaign.status === "ACTIVE");
  const past = withPerf.filter((c) => c.campaign.status !== "ACTIVE");

  const totals = withPerf.reduce(
    (acc, { campaign, perf }) => ({
      invested: acc.invested + campaign.budget,
      impressions: acc.impressions + campaign.impressions,
      views: acc.views + campaign.views,
      requests: acc.requests + perf.requests,
      jobs: acc.jobs + perf.jobs,
    }),
    { invested: 0, impressions: 0, views: 0, requests: 0, jobs: 0 }
  );

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Publicidad</h1>
        <Link href="/ads/new" className="btn-primary !py-2 !px-3 !text-xs">+ Nueva campaña</Link>
      </div>
      <p className="text-sm text-muted mt-1">Promocioná tu perfil y medí los resultados.</p>

      {sp.ok && (
        <div className="card p-4 mt-4 border-fg bg-surface-2">
          <p className="text-sm font-medium">✓ Campaña lanzada. Ya estás apareciendo más arriba.</p>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="card p-8 text-center mt-6">
          <p className="text-2xl">📣</p>
          <p className="font-semibold mt-2">Todavía no hiciste publicidad</p>
          <p className="text-sm text-muted mt-1">
            Con una campaña aparecés antes en los listados y el mapa, con insignia de patrocinado.
          </p>
          <Link href="/ads/new" className="btn-primary w-full mt-4">Crear mi primera campaña</Link>
        </div>
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <Stat label="Invertido" value={formatMoney(totals.invested)} />
            <Stat label="Veces que apareciste" value={totals.impressions.toLocaleString("es-AR")} />
            <Stat label="Abrieron tu perfil" value={totals.views.toLocaleString("es-AR")} />
            <Stat
              label={me.role === "WORKER" ? "Solicitudes recibidas" : "Postulaciones recibidas"}
              value={totals.requests}
            />
            <Stat
              label={me.role === "WORKER" ? "Trabajos obtenidos" : "Contrataciones"}
              value={totals.jobs}
              hint="Durante las campañas"
            />
            <Stat
              label="Conversión aprox."
              value={`${conversionPct(totals.requests, totals.views)}%`}
              hint="Solicitudes / visitas"
            />
          </div>

          {totals.impressions > 0 && (
            <div className="card p-5 mt-3">
              <h2 className="font-semibold text-sm mb-3">Embudo</h2>
              <BarChart
                data={[
                  { label: "Apariciones", value: totals.impressions },
                  { label: "Visitas", value: totals.views },
                  { label: "Solicitudes", value: totals.requests },
                  { label: "Trabajos", value: totals.jobs },
                ]}
              />
            </div>
          )}

          {/* Campañas activas */}
          {active.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold mb-2">Campañas activas ({active.length})</h2>
              <div className="space-y-3">
                {active.map(({ campaign: c, perf, daysLeft }) => (
                  <CampaignCard key={c.id} c={c} perf={perf} daysLeft={daysLeft} role={me.role} cancellable />
                ))}
              </div>
            </section>
          )}

          {/* Historial */}
          {past.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold mb-2">Finalizadas</h2>
              <div className="space-y-3">
                {past.map(({ campaign: c, perf, daysLeft }) => (
                  <CampaignCard key={c.id} c={c} perf={perf} daysLeft={daysLeft} role={me.role} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

type CampaignRow = {
  id: string;
  objective: string;
  reach: string;
  budget: number;
  days: number;
  dailyBudget: number;
  boost: number;
  status: string;
  startedAt: Date;
  endsAt: Date;
  impressions: number;
  views: number;
};

function CampaignCard({
  c,
  perf,
  daysLeft,
  role,
  cancellable,
}: {
  c: CampaignRow;
  perf: { requests: number; jobs: number };
  daysLeft: number;
  role: string;
  cancellable?: boolean;
}) {
  return (
    <div className={`card p-4 ${c.status !== "ACTIVE" ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{objectiveLabel(c.objective)}</p>
          <p className="text-xs text-muted">
            {reachLabel(c.reach)} · {formatMoney(c.budget)} · {c.days} días
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${
            c.status === "ACTIVE" ? "bg-fg text-bg" : "bg-surface-2 text-muted"
          }`}
        >
          {STATUS_LABEL[c.status]}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-line text-center">
        <div>
          <p className="font-bold text-sm">{c.impressions.toLocaleString("es-AR")}</p>
          <p className="text-[10px] text-faint">Apariciones</p>
        </div>
        <div>
          <p className="font-bold text-sm">{c.views.toLocaleString("es-AR")}</p>
          <p className="text-[10px] text-faint">Visitas</p>
        </div>
        <div>
          <p className="font-bold text-sm">{perf.requests}</p>
          <p className="text-[10px] text-faint">{role === "WORKER" ? "Solicitudes" : "Postulac."}</p>
        </div>
        <div>
          <p className="font-bold text-sm">{perf.jobs}</p>
          <p className="text-[10px] text-faint">Trabajos</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-[11px] text-faint">
          {c.status === "ACTIVE"
            ? `Termina en ${daysLeft} ${daysLeft === 1 ? "día" : "días"} · ${formatMoney(c.dailyBudget)}/día`
            : `${formatDate(c.startedAt)} — ${formatDate(c.endsAt)}`}
        </p>
        {cancellable && (
          <form action={cancelCampaign.bind(null, c.id)}>
            <button className="btn-ghost !py-1 !px-2 !text-[11px] text-red-600">Cancelar</button>
          </form>
        )}
      </div>
    </div>
  );
}
