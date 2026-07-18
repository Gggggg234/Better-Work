import { db } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
import { BarChart } from "@/components/charts/Charts";
import { formatMoney, formatDateTime } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  COMPANY_PLAN: "Plan de empresa",
  CAMPAIGN: "Campaña de publicidad",
};

/** Últimos n meses, del más viejo al más nuevo. */
function lastMonths(n: number): { label: string; start: Date; end: Date }[] {
  const out: { label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    out.push({ label: start.toLocaleDateString("es-AR", { month: "short" }), start, end });
  }
  return out;
}

export default async function AdminRevenuePage() {
  const promotions = await db.promotion.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  // Promotion guarda el userId sin relación (es un registro contable, no depende del usuario).
  const buyers = await db.user.findMany({
    where: { id: { in: [...new Set(promotions.map((p) => p.userId))] } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const buyerById = new Map(buyers.map((u) => [u.id, u]));

  const planIncome = promotions.filter((p) => p.kind === "COMPANY_PLAN").reduce((s, p) => s + p.amount, 0);
  const adsIncome = promotions.filter((p) => p.kind === "CAMPAIGN").reduce((s, p) => s + p.amount, 0);
  const total = planIncome + adsIncome;

  const [activeCompanies, activeCampaigns] = await Promise.all([
    db.companyProfile.count({ where: { planActiveUntil: { gt: new Date() } } }),
    db.campaign.count({ where: { status: "ACTIVE" } }),
  ]);

  const byMonth = lastMonths(6).map((m) => ({
    label: m.label,
    value: promotions.filter((p) => p.createdAt >= m.start && p.createdAt < m.end).reduce((s, p) => s + p.amount, 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Ingresos</h1>
        <p className="text-sm text-muted mt-0.5">
          Membresías de empresa y campañas de publicidad. Better Work no cobra comisión por trabajo.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-lg font-bold">{formatMoney(total)}</p>
          <p className="text-xs text-faint">Ingresos totales</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{formatMoney(planIncome)}</p>
          <p className="text-xs text-faint">Membresías</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{formatMoney(adsIncome)}</p>
          <p className="text-xs text-faint">Publicidad</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{activeCompanies}</p>
          <p className="text-xs text-faint">Empresas con plan activo</p>
        </div>
      </div>

      {total > 0 && (
        <div className="card p-5 max-w-lg">
          <h2 className="font-semibold text-sm mb-3">Ingresos por mes</h2>
          <BarChart data={byMonth} />
        </div>
      )}

      <div className="card p-4 max-w-xs">
        <p className="text-lg font-bold">{activeCampaigns}</p>
        <p className="text-xs text-faint">
          {activeCampaigns === 1 ? "campaña activa" : "campañas activas"} en este momento
        </p>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Movimientos</h2>
        <div className="card divide-y divide-line">
          {promotions.map((p) => {
            const buyer = buyerById.get(p.userId);
            return (
              <div key={p.id} className="p-4 flex items-center gap-3 text-sm">
                <Avatar name={buyer?.name ?? "?"} url={buyer?.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{KIND_LABEL[p.kind] ?? p.kind}</p>
                  <p className="text-xs text-faint truncate">
                    {buyer?.name ?? "Usuario eliminado"} · {p.days} días · {formatDateTime(p.createdAt)}
                  </p>
                </div>
                <p className="font-semibold shrink-0">{formatMoney(p.amount)}</p>
              </div>
            );
          })}
          {promotions.length === 0 && (
            <p className="p-6 text-center text-sm text-faint">Todavía no hay membresías ni campañas.</p>
          )}
        </div>
      </section>
    </div>
  );
}
