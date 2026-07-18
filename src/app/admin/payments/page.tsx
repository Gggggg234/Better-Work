import { db } from "@/lib/db";
import { approvePlanRequest, rejectPlanRequest } from "@/lib/actions/planRequests";
import { PLAN_REQUEST_STATUS } from "@/lib/planRequests";
import { formatMoney, formatDateTime } from "@/lib/format";
import { RejectRequest } from "@/components/admin/RejectRequest";

export default async function AdminPaymentsPage() {
  const [pending, reviewed, plans] = await Promise.all([
    db.planRequest.findMany({
      where: { status: "PENDING" },
      include: { company: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "asc" }, // el más viejo primero: se atiende por orden de llegada
    }),
    db.planRequest.findMany({
      where: { status: { not: "PENDING" } },
      include: { company: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { reviewedAt: "desc" },
      take: 30,
    }),
    db.plan.findMany({ select: { key: true, name: true } }),
  ]);

  const planName = (key: string) => plans.find((p) => p.key === key)?.name ?? key;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Pagos pendientes</h1>
        <p className="text-sm text-muted mt-0.5">
          Comprobantes de transferencia enviados por las empresas. Al aprobar, la membresía se activa y se calcula el
          vencimiento automáticamente.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-2xl">✓</p>
          <p className="font-semibold mt-2">No hay pagos esperando revisión</p>
          <p className="text-sm text-muted mt-1">Cuando una empresa envíe un comprobante, aparece acá.</p>
        </div>
      ) : (
        <section>
          <h2 className="font-semibold mb-3">
            Esperando revisión{" "}
            <span className="rounded-full bg-fg text-bg px-2 py-0.5 text-xs">{pending.length}</span>
          </h2>
          <div className="space-y-3">
            {pending.map((r) => (
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

                {/* Comprobante */}
                <a
                  href={r.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block mt-3 rounded-xl border border-line overflow-hidden hover:border-fg transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.receiptUrl}
                    alt={`Comprobante de ${r.company.companyName}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full max-h-72 object-contain bg-surface-2"
                  />
                  <span className="block px-3 py-2 text-xs text-muted">Abrir comprobante en tamaño completo →</span>
                </a>

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

      {reviewed.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Historial</h2>
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
