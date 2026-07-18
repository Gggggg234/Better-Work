import Link from "next/link";
import { db } from "@/lib/db";
import { approvePlanRequest, rejectPlanRequest } from "@/lib/actions/planRequests";
import { approveTopUp, rejectTopUp } from "@/lib/actions/wallet";
import { confirmPayment, rejectPayment } from "@/lib/actions/escrow";
import { PLAN_REQUEST_STATUS } from "@/lib/planRequests";
import { formatMoney, formatDateTime } from "@/lib/format";
import { RejectRequest } from "@/components/admin/RejectRequest";

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
  const [planReqs, topUps, jobPayments, reviewed, plans] = await Promise.all([
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
    db.payment.findMany({
      where: { status: "PENDING" },
      include: { job: { include: { client: { select: { name: true } }, worker: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.planRequest.findMany({
      where: { status: { not: "PENDING" } },
      include: { company: { include: { user: { select: { name: true } } } } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    }),
    db.plan.findMany({ select: { key: true, name: true } }),
  ]);

  const planName = (key: string) => plans.find((p) => p.key === key)?.name ?? key;
  const total = planReqs.length + topUps.length + jobPayments.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Pagos pendientes</h1>
        <p className="text-sm text-muted mt-0.5">
          Todo lo que espera tu aprobación: membresías de empresa, cargas de presupuesto publicitario y pagos de
          trabajos retenidos.
        </p>
      </div>

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

      {/* ── Pagos de trabajos (escrow) ── */}
      {jobPayments.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">
            Pagos de trabajos{" "}
            <span className="rounded-full bg-fg text-bg px-2 py-0.5 text-xs">{jobPayments.length}</span>
          </h2>
          <p className="text-xs text-muted mb-3">
            Al confirmar, el dinero queda <strong>retenido</strong> y el profesional puede empezar. Se libera solo
            cuando el cliente confirma el código de finalización.
          </p>
          <div className="space-y-3">
            {jobPayments.map((p) => (
              <div key={p.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold">{p.job.title}</p>
                    <p className="text-xs text-muted">
                      {p.job.client.name} → {p.job.worker.name}
                    </p>
                  </div>
                  <p className="font-bold shrink-0">{formatMoney(p.amount)}</p>
                </div>
                <p className="text-xs text-faint mt-2">Enviado el {formatDateTime(p.createdAt)}</p>

                {p.receiptUrl && <Receipt url={p.receiptUrl} alt={`Comprobante de ${p.job.client.name}`} />}

                <div className="flex gap-2 mt-4">
                  <form action={confirmPayment.bind(null, p.id)} className="flex-1">
                    <button className="btn-primary w-full !py-2.5 !text-sm">Confirmar y retener</button>
                  </form>
                  <form action={rejectPayment.bind(null, p.id)} className="flex-1">
                    <button className="btn-secondary w-full !py-2.5 !text-sm text-red-600">Rechazar</button>
                  </form>
                </div>
                <Link href={`/jobs/${p.jobId}`} className="block text-center text-xs text-muted hover:text-fg mt-2">
                  Ver el trabajo →
                </Link>
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
