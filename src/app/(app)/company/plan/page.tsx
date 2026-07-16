import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { activateCompanyPlan } from "@/lib/actions/monetize";
import { getCompanyPlanPrice } from "@/lib/pricing";
import { isPlanActive, daysLeft } from "@/lib/company";
import { formatMoney, formatDate } from "@/lib/format";

const BENEFITS = [
  "Aparecés en el mapa y las búsquedas de Better Work",
  "Publicás empleos ilimitados y recibís postulaciones",
  "Contratás trabajadores desde tu perfil empresarial",
  "Podés destacar tu empresa y tus ofertas con publicidad",
];

export default async function CompanyPlanPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "COMPANY" || !me.companyProfile) redirect("/app");
  const sp = await searchParams;

  const [price, company] = await Promise.all([
    getCompanyPlanPrice(),
    db.companyProfile.findUnique({ where: { userId: me.id } }),
  ]);
  const active = isPlanActive(company?.planActiveUntil);
  const left = daysLeft(company?.planActiveUntil);

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Plan Premium para empresas</h1>
      <p className="text-sm text-muted mt-1">
        Desbloqueá todas las funciones empresariales de Better Work.
      </p>

      {active && (
        <div className="card p-4 mt-5 border-fg bg-surface-2">
          <p className="text-sm font-medium">Tu plan está activo</p>
          <p className="text-xs text-muted mt-0.5">
            Vence el {formatDate(company!.planActiveUntil!)}{left != null && ` · ${left} días restantes`}. Podés renovar
            para sumar 30 días más.
          </p>
        </div>
      )}

      <div className="card p-6 mt-5 text-center">
        <p className="text-4xl font-bold">{formatMoney(price)}</p>
        <p className="text-sm text-muted mt-1">por mes (30 días)</p>
      </div>

      <ul className="mt-5 space-y-2">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-start gap-2.5 text-sm">
            <span className="text-fg mt-0.5">✓</span>
            <span className="text-muted">{b}</span>
          </li>
        ))}
      </ul>

      <form action={activateCompanyPlan} className="mt-6">
        <button className="btn-primary w-full !py-3.5">
          {active ? `Renovar por ${formatMoney(price)}` : `Activar plan por ${formatMoney(price)}`}
        </button>
      </form>
      {sp.error === "pago" && (
        <p className="text-sm text-red-600 mt-3 text-center">No pudimos procesar el pago. Probá de nuevo.</p>
      )}
      <p className="text-xs text-faint mt-3 text-center">
        El cobro se procesa a través de Better Work. El plan se renueva manualmente (no hay débito automático).
      </p>
    </main>
  );
}
