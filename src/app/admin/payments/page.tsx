import { db } from "@/lib/db";
import { approvePlanRequest, rejectPlanRequest } from "@/lib/actions/planRequests";
import { approveTopUp, rejectTopUp } from "@/lib/actions/wallet";
import { approveProRequest, rejectProRequest } from "@/lib/actions/pro";
import { PLAN_REQUEST_STATUS } from "@/lib/planRequests";
import { formatMoney, formatDateTime } from "@/lib/format";
import { RejectRequest } from "@/components/admin/RejectRequest";
import { billingMode, SUB_STATUS_LABEL } from "@/lib/billing";

const MP_KIND: Record<string, string> = { PRO: "Pro", PLAN: "Plan", WALLET: "Saldo publicitario" };

/** Cobros que entraron solos por Mercado Pago (no requieren aprobación manual). */
async function MercadoPagoSection() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [recent, activeSubs, monthTotal] = await Promise.all([
    db.mpPayment.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.subscription.findMany({
      where: { status: { in: ["AUTHORIZED", "PAUSED"] } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.mpPayment.aggregate({ where: { status: "APPROVED", approvedAt: { gte: monthStart } }, _sum: { amount: true } }),
  ]);
  const mode = billingMode();
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">Mercado Pago</h2>
        <p className="text-xs text-muted mt-0.5">
          {mode === "mercadopago"
            ? "Conectado. Estos cobros se acreditan solos."
            : mode === "simulated"
              ? "Sin credenciales: modo prueba (sólo en desarrollo)."
              : "Sin credenciales: cargá MP_ACCESS_TOKEN en Vercel para cobrar con Mercado Pago."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-muted">Cobrado este mes</p>
          <p className="text-xl font-bold mt-1">{formatMoney(monthTotal._sum.amount ?? 0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Suscripciones activas</p>
          <p className="text-xl font-bold mt-1">{activeSubs.length}</p>
        </div>
      </div>
      {activeSubs.length > 0 && (
        <div className="card divide-y divide-line">
          {activeSubs.map((s) => (
            <div key={s.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{s.user.name} · {s.kind === "PRO" ? "Pro" : `Plan ${s.planKey}`}</p>
                <p className="text-xs text-faint truncate">{s.user.email} · {SUB_STATUS_LABEL[s.status] ?? s.status}</p>
              </div>
              <p className="font-semibold shrink-0">{formatMoney(s.amount)}/mes</p>
            </div>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="card divide-y divide-line">
          {recent.map((p) => (
            <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {p.user.name} · {MP_KIND[p.kind] ?? p.kind}
                  {p.refKey ? ` ${p.refKey}` : ""}
                </p>
                <p className="text-xs text-faint truncate">
                  {formatDateTime(p.createdAt)} · {p.source === "SUBSCRIPTION" ? "débito automático" : "pago único"}
                </p>
              </div>
              <span className={`badge shrink-0 ${p.status === "APPROVED" ? "badge-success" : "badge-danger"}`}>
                {p.status === "APPROVED" ? formatMoney(p.amount) : "Rechazado"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Comprobante clicleable, común a los tres tipos de aprobación. */
function Receipt({ url, alt }: { url: string; alt: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block mt-3 rounded-xl border border-line overflow-hidden hover:border-fg transition"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} loading="lazy" decoding="async" className="w-full max-h-72 object-contain bg-surface-2" />
      <span className="block px-3 py-2 text-xs text-muted">Abrir comprobante en tamaño completo →</span>
    </a>
  );
}

export default async function AdminPaymentsPage() {
  const [planReqs, topUps, reviewed, plans, proReqs] = await Promise.all([
    db.planRequest.findMany({
      where: { status: "PENDING" },
      include: { company: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "asc" }, // el más viejo primero: por orden de llegada
    }),
    db.walletTopUp.findMany({
      where: { status: "PENDING" },
      include: { wallet: { include: { user: { select: { name: true, email: true, role: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.planRequest.findMany({
      where: { status: { not: "PENDING" } },
      include: { company: { include: { user: { select: { name: true } } } } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    }),
    db.plan.findMany({ select: { key: true, name: true } }),
    db.proRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const planName = (key: string) => plans.find((p) => p.key === key)?.name ?? key;
  const total = planReqs.length + topUps.length + proReqs.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Pagos pendientes</h1>
        <p className="text-sm text-muted mt-0.5">
          Suscripciones Pro, membresías de empresa y cargas de presupuesto publicitario. El pago de los trabajos
          no pasa por acá.
        </p>
      </div>

      <MercadoPagoSection />

      {total === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-2xl">✓</p>
          <p className="font-semibold mt-2">No hay nada esperando revisión</p>
          <p className="text-sm text-muted mt-1">Cuando llegue un comprobante nuevo, aparece acá.</p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          <strong className="text-fg">{total}</strong> {total === 1 ? "comprobante" : "comprobantes"} esperando
          revisión.
        </p>
      )}

      {/* ── Suscripciones Better Work Pro ── */}
      {proReqs.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">
            Better Work Pro{" "}
            <span className="rounded-full bg-fg text-bg px-2 py-0.5 text-xs">{proReqs.length}</span>
          </h2>
          <div className="space-y-3">
            {proReqs.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.user.name}</p>
                    <p className="text-xs text-muted">{r.user.email} · Profesional</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{formatMoney(r.amount)}</p>
                    <p className="text-xs text-muted">Pro · {r.days} días</p>
                  </div>
                </div>
                <p className="text-xs text-faint mt-2">Enviado el {formatDateTime(r.createdAt)}</p>

                <Receipt url={r.receiptUrl} alt={`Comprobante de ${r.user.name}`} />

                <div className="flex gap-2 mt-4">
                  <form action={approveProRequest.bind(null, r.id)} className="flex-1">
                    <button className="btn-primary w-full !py-2.5 !text-sm">Activar Pro</button>
                  </form>
                  <RejectRequest requestId={r.id} action={rejectProRequest} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Cargas de presupuesto publicitario ── */}
      {topUps.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">
            Cargas de presupuesto publicitario{" "}
            <span className="rounded-full bg-fg text-bg px-2 py-0.5 text-xs">{topUps.length}</span>
          </h2>
          <div className="space-y-3">
            {topUps.map((t) => (
              <div key={t.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold">{t.wallet.user.name}</p>
                    <p className="text-xs text-muted">
                      {t.wallet.user.email} · {t.wallet.user.role === "WORKER" ? "Trabajador" : "Empresa"}
                    </p>
                  </div>
                  <p className="font-bold shrink-0">{formatMoney(t.amount)}</p>
                </div>
                <p className="text-xs text-faint mt-2">Enviado el {formatDateTime(t.createdAt)}</p>

                <Receipt url={t.receiptUrl} alt={`Comprobante de ${t.wallet.user.name}`} />

                <div className="flex gap-2 mt-4">
                  <form action={approveTopUp.bind(null, t.id)} className="flex-1">
                    <button className="btn-primary w-full !py-2.5 !text-sm">Acreditar saldo</button>
                  </form>
                  <RejectRequest requestId={t.id} action={rejectTopUp} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Membresías de empresa ── */}
      {planReqs.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">
            Membresías de empresa{" "}
            <span className="rounded-full bg-fg text-bg px-2 py-0.5 text-xs">{planReqs.length}</span>
          </h2>
          <div className="space-y-3">
            {planReqs.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.company.companyName}</p>
                    <p className="text-xs text-muted">{r.company.user.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{formatMoney(r.amount)}</p>
                    <p className="text-xs text-muted">Plan {planName(r.planKey)}</p>
                  </div>
                </div>
                <p className="text-xs text-faint mt-2">Enviado el {formatDateTime(r.createdAt)}</p>

                <Receipt url={r.receiptUrl} alt={`Comprobante de ${r.company.companyName}`} />

                <div className="flex gap-2 mt-4">
                  <form action={approvePlanRequest.bind(null, r.id)} className="flex-1">
                    <button className="btn-primary w-full !py-2.5 !text-sm">Aprobar</button>
                  </form>
                  <RejectRequest requestId={r.id} action={rejectPlanRequest} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Historial de membresías ── */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Historial de membresías</h2>
          <div className="card divide-y divide-line">
            {reviewed.map((r) => (
              <div key={r.id} className="p-4 flex items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.company.companyName}</p>
                  <p className="text-xs text-faint truncate">
                    Plan {planName(r.planKey)} · {formatMoney(r.amount)} ·{" "}
                    {r.reviewedAt ? formatDateTime(r.reviewedAt) : "—"}
                    {r.note && ` · ${r.note}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${
                    r.status === "APPROVED" ? "bg-fg text-bg" : "bg-surface-2 text-muted"
                  }`}
                >
                  {PLAN_REQUEST_STATUS[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
