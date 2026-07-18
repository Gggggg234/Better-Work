import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export default async function AdminDashboard() {
  const now = new Date();
  const [
    users,
    workers,
    companies,
    payingCompanies,
    jobs,
    activeJobs,
    completedCount,
    reports,
    promotions,
    activeCampaigns,
  ] = await Promise.all([
    db.user.count(),
    db.workerProfile.count(),
    db.companyProfile.count(),
    db.companyProfile.count({ where: { planActiveUntil: { gt: now } } }),
    db.job.count(),
    db.job.count({ where: { status: { in: ["REQUESTED", "ACCEPTED", "EN_ROUTE", "WORKING"] } } }),
    db.job.count({ where: { status: "COMPLETED" } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.promotion.groupBy({ by: ["kind"], _sum: { amount: true } }),
    db.campaign.count({ where: { status: "ACTIVE" } }),
  ]);

  const income = (kind: string) => promotions.find((p) => p.kind === kind)?._sum.amount ?? 0;
  const planIncome = income("COMPANY_PLAN");
  const adsIncome = income("CAMPAIGN");

  const stats: [string, string][] = [
    [String(users), "Usuarios"],
    [String(workers), "Trabajadores"],
    [String(companies), "Empresas"],
    [String(payingCompanies), "Empresas con plan"],
    [String(jobs), "Trabajos totales"],
    [String(activeJobs), "Trabajos activos"],
    [String(completedCount), "Trabajos finalizados"],
    [String(reports), "Denuncias abiertas"],
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
          <h2 className="font-semibold text-sm">Membresías de empresa</h2>
          <p className="text-2xl font-bold mt-1">{formatMoney(planIncome)}</p>
          <p className="text-xs text-faint mt-1">
            {payingCompanies} {payingCompanies === 1 ? "empresa" : "empresas"} con plan activo. Los trabajadores
            usan Better Work gratis.
          </p>
          <Link href="/admin/plans" className="btn-secondary w-full mt-4 !py-2 !text-xs">Editar planes</Link>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-sm">Publicidad</h2>
          <p className="text-2xl font-bold mt-1">{formatMoney(adsIncome)}</p>
          <p className="text-xs text-faint mt-1">
            {activeCampaigns} {activeCampaigns === 1 ? "campaña activa" : "campañas activas"} de trabajadores y
            empresas.
          </p>
          <Link href="/admin/revenue" className="btn-secondary w-full mt-4 !py-2 !text-xs">Ver ingresos</Link>
        </div>
      </div>
    </div>
  );
}
