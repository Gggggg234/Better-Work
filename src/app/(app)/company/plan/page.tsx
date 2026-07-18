import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { activatePlan } from "@/lib/actions/monetize";
import { listPlans, benefitList, isPlanActive } from "@/lib/plans";
import { formatMoney, formatDate } from "@/lib/format";

export default async function CompanyPlanPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "COMPANY" || !me.companyProfile) redirect("/app");
  const sp = await searchParams;

  const [plans, company] = await Promise.all([
    listPlans(),
    db.companyProfile.findUnique({ where: { userId: me.id } }),
  ]);
  const active = isPlanActive(company?.planActiveUntil);

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Membresía</h1>
      <p className="text-sm text-muted mt-1">
        Elegí el plan que necesita tu empresa. Los trabajadores usan Better Work gratis.
      </p>

      {active && company?.planKey && (
        <div className="card p-4 mt-5 border-fg bg-surface-2">
          <p className="text-sm font-medium">
            Plan {plans.find((p) => p.key === company.planKey)?.name ?? company.planKey} activo
          </p>
          <p className="text-xs text-muted mt-0.5">
            Vence el {formatDate(company.planActiveUntil!)}. Renovalo o cambiá de plan cuando quieras.
          </p>
        </div>
      )}
      {sp.error === "plan" && <p className="text-sm text-red-600 mt-3">Ese plan no está disponible.</p>}

      <div className="space-y-3 mt-6">
        {plans.map((p) => {
          const current = active && company?.planKey === p.key;
          return (
            <form key={p.key} action={activatePlan} className={`card p-5 ${current ? "border-fg" : ""}`}>
              <input type="hidden" name="planKey" value={p.key} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg">{p.name}</h2>
                    {current && (
                      <span className="rounded-full bg-fg text-bg px-2 py-0.5 text-[11px] font-medium">Tu plan</span>
                    )}
                  </div>
                  <p className="text-xs text-muted">{p.tagline}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg">{formatMoney(p.price)}</p>
                  <p className="text-[11px] text-faint">por mes</p>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5">
                {benefitList(p).map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <span className="text-fg mt-0.5">✓</span>
                    <span className="text-muted">{b}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full mt-4 ${current ? "btn-secondary" : "btn-primary"}`}>
                {current ? "Renovar 30 días" : active ? `Cambiar a ${p.name}` : `Activar ${p.name}`}
              </button>
            </form>
          );
        })}
      </div>

      <p className="text-xs text-faint mt-4 text-center">
        Todavía no cobramos online: activás el plan y coordinamos el pago por chat. Podés cambiarlo o darlo de baja
        cuando quieras.
      </p>
    </main>
  );
}
