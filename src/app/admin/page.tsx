import Link from "next/link";
import { db } from "@/lib/db";
import { getCommissionPct } from "@/lib/commission";
import { formatMoney } from "@/lib/format";

export default async function AdminDashboard() {
  const [users, workers, companies, jobs, activeJobs, completedCount, released, held, reports, pct] =
    await Promise.all([
      db.user.count(),
      db.workerProfile.count(),
      db.companyProfile.count(),
      db.job.count(),
      db.job.count({ where: { status: { in: ["REQUESTED", "ACCEPTED", "EN_ROUTE", "WORKING"] } } }),
      db.job.count({ where: { status: "COMPLETED" } }),
      db.payment.aggregate({ where: { status: "RELEASED" }, _sum: { commission: true, amount: true } }),
      db.payment.aggregate({ where: { status: "HELD" }, _sum: { amount: true }, _count: true }),
      db.report.count({ where: { status: "OPEN" } }),
      getCommissionPct(),
    ]);

  const commissionEarned = released._sum.commission ?? 0;

  const stats: [string, string][] = [
    [String(users), "Usuarios"],
    [String(workers), "Trabajadores"],
    [String(companies), "Empresas"],
    [String(jobs), "Trabajos totales"],
    [String(activeJobs), "Trabajos activos"],
    [String(completedCount), "Trabajos finalizados"],
    [String(reports), "Denuncias abiertas"],
    [formatMoney(commissionEarned), "Comisiones cobradas"],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Resumen</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(([v, l]) => (
          <div key={l} className="card p-4">
            <p className="text-lg font-bold truncate">{v}</p>
            <p className="text-xs text-faint mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="card p-5">
          <h2 className="font-semibold text-sm">Comisión configurada</h2>
          <p className="text-2xl font-bold mt-1">{pct}%</p>
          <p className="text-xs text-faint mt-1">
            Se descuenta automáticamente de cada pago cuando se libera al trabajador.
          </p>
          <Link href="/admin/settings" className="btn-secondary w-full mt-4 !py-2 !text-xs">Editar comisión</Link>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-sm">Dinero en custodia</h2>
          <p className="text-2xl font-bold mt-1">{formatMoney(held._sum.amount ?? 0)}</p>
          <p className="text-xs text-faint mt-1">
            {held._count} {held._count === 1 ? "pago retenido" : "pagos retenidos"} a la espera del código de finalización
            · volumen liberado {formatMoney(released._sum.amount ?? 0)}.
          </p>
          <Link href="/admin/revenue" className="btn-secondary w-full mt-4 !py-2 !text-xs">Ver movimientos</Link>
        </div>
      </div>
    </div>
  );
}
