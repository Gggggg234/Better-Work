import { db } from "@/lib/db";
import { getCommissionPct } from "@/lib/commission";
import { Avatar } from "@/components/Avatar";
import { formatMoney, formatDateTime } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  HELD: "Retenido",
  RELEASED: "Liberado",
  REFUNDED: "Devuelto",
};

const PROMO_LABEL: Record<string, string> = {
  COMPANY_PLAN: "Plan empresa",
  PROFILE: "Perfil destacado",
  OFFER: "Oferta destacada",
  POST: "Publicación destacada",
};

export default async function AdminRevenuePage() {
  const [payments, promotions, pct] = await Promise.all([
    db.payment.findMany({
      include: { job: { include: { worker: true, client: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.promotion.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    getCommissionPct(),
  ]);

  const released = payments.filter((p) => p.status === "RELEASED");
  const held = payments.filter((p) => p.status === "HELD");
  const commissionEarned = released.reduce((s, p) => s + p.commission, 0);
  const heldAmount = held.reduce((s, p) => s + p.amount, 0);
  const planIncome = promotions.filter((p) => p.kind === "COMPANY_PLAN").reduce((s, p) => s + p.amount, 0);
  const adsIncome = promotions.filter((p) => p.kind !== "COMPANY_PLAN").reduce((s, p) => s + p.amount, 0);
  const total = commissionEarned + planIncome + adsIncome;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Ingresos</h1>
        <p className="text-sm text-muted mt-0.5">
          Comisiones de trabajos ({pct}%), planes de empresa y publicidad.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-lg font-bold">{formatMoney(total)}</p>
          <p className="text-xs text-faint">Ingresos totales</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{formatMoney(commissionEarned)}</p>
          <p className="text-xs text-faint">Comisiones</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{formatMoney(planIncome)}</p>
          <p className="text-xs text-faint">Planes empresa</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{formatMoney(adsIncome)}</p>
          <p className="text-xs text-faint">Publicidad</p>
        </div>
      </div>

      {promotions.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Planes y publicidad</h2>
          <div className="card divide-y divide-line">
            {promotions.slice(0, 30).map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{PROMO_LABEL[p.kind] ?? p.kind}</p>
                  <p className="text-xs text-faint">{p.days} días · {formatDateTime(p.createdAt)}</p>
                </div>
                <p className="font-semibold">{formatMoney(p.amount)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="card p-4">
          <p className="text-lg font-bold">{formatMoney(heldAmount)}</p>
          <p className="text-xs text-faint">Retenido en custodia</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{formatMoney(released.reduce((s, p) => s + p.amount, 0))}</p>
          <p className="text-xs text-faint">Volumen liberado</p>
        </div>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Movimientos</h2>
        <div className="card divide-y divide-line">
          {payments.map((p) => (
            <div key={p.id} className="p-4 flex items-center gap-3 text-sm">
              <Avatar name={p.job.worker.name} url={p.job.worker.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.job.title}</p>
                <p className="text-xs text-faint">
                  {p.job.client.name} → {p.job.worker.name} · {formatDateTime(p.createdAt)} · ref {p.providerRef.slice(0, 18)}…
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatMoney(p.amount)}</p>
                <p className="text-xs text-faint">comisión {formatMoney(p.commission)}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${
                  p.status === "RELEASED" ? "bg-fg text-bg" : p.status === "HELD" ? "border border-line" : "bg-surface-2 text-muted"
                }`}
              >
                {STATUS_LABEL[p.status]}
              </span>
            </div>
          ))}
          {payments.length === 0 && (
            <p className="p-6 text-center text-sm text-faint">Todavía no se procesaron pagos.</p>
          )}
        </div>
      </section>
    </div>
  );
}
