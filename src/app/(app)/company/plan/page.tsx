import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { listPlans, benefitList, isPlanActive } from "@/lib/plans";
import { getTransferInfo } from "@/lib/settings";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { PlanCheckout } from "@/components/company/PlanCheckout";
import { CopyField } from "@/components/CopyField";
import { BackButton } from "@/components/BackButton";

const ERRORS: Record<string, string> = {
  plan: "Ese plan no está disponible.",
  pendiente: "Ya tenés un comprobante en revisión. Esperá la respuesta antes de enviar otro.",
  comprobante: "Adjuntá el comprobante de la transferencia.",
  archivo: "No pudimos leer ese archivo. Subí una imagen (JPG, PNG o WEBP) de hasta 8 MB.",
};

export default async function CompanyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "COMPANY" || !me.companyProfile) redirect("/app");
  const sp = await searchParams;

  const [plans, company, transfer] = await Promise.all([
    listPlans(),
    db.companyProfile.findUnique({ where: { userId: me.id } }),
    getTransferInfo(),
  ]);
  if (!company) redirect("/app");

  const active = isPlanActive(company.planActiveUntil);

  const [pending, lastRejected] = await Promise.all([
    db.planRequest.findFirst({
      where: { companyId: company.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    db.planRequest.findFirst({
      where: { companyId: company.id, status: "REJECTED" },
      orderBy: { reviewedAt: "desc" },
    }),
  ]);

  const planName = (key: string | null) => plans.find((p) => p.key === key)?.name ?? key ?? "";

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <BackButton fallback="/company" />
      <h1 className="text-2xl font-bold">Membresía</h1>
      <p className="text-sm text-muted mt-1">
        Elegí el plan que necesita tu empresa. Los trabajadores usan Better Work gratis.
      </p>

      {sp.ok === "enviado" && (
        <div className="card p-4 mt-5 bg-fg text-bg">
          <p className="text-sm font-medium">✓ Recibimos tu comprobante</p>
          <p className="text-xs text-bg/70 mt-0.5">
            Lo revisamos a la brevedad. Te avisamos por email apenas se apruebe.
          </p>
        </div>
      )}
      {sp.error && ERRORS[sp.error] && (
        <div className="card p-4 mt-5 border-red-300" role="alert">
          <p className="text-sm text-red-600">⚠ {ERRORS[sp.error]}</p>
        </div>
      )}

      {/* Estado actual */}
      {active && (
        <div className="card p-4 mt-5 border-fg bg-surface-2">
          <p className="text-sm font-medium">Plan {planName(company.planKey)} activo</p>
          <p className="text-xs text-muted mt-0.5">
            Vence el {formatDate(company.planActiveUntil!)}. Renovalo o cambiá de plan cuando quieras.
          </p>
        </div>
      )}

      {/* Comprobante en revisión */}
      {pending && (
        <div className="card p-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fg animate-pulse" aria-hidden />
            <p className="text-sm font-medium">Pendiente de aprobación</p>
          </div>
          <p className="text-xs text-muted mt-1">
            Enviaste el comprobante del plan {planName(pending.planKey)} por {formatMoney(pending.amount)} el{" "}
            {formatDateTime(pending.createdAt)}. Un administrador lo va a revisar.
          </p>
        </div>
      )}

      {/* Último rechazo, con el motivo */}
      {!pending && lastRejected && (
        <div className="card p-4 mt-3 border-red-300">
          <p className="text-sm font-medium text-red-600">Tu último comprobante fue rechazado</p>
          {lastRejected.note && <p className="text-xs text-muted mt-1">Motivo: {lastRejected.note}</p>}
          <p className="text-xs text-muted mt-1">Podés volver a enviarlo desde acá.</p>
        </div>
      )}

      {/* Datos para transferir */}
      <section className="card p-5 mt-6">
        <h2 className="font-semibold">Cómo se paga</h2>
        <p className="text-sm text-muted mt-1">
          El pago es por transferencia bancaria. Transferí el importe del plan y subí el comprobante: activamos la
          membresía apenas lo validemos.
        </p>
        <div className="mt-4 space-y-2">
          <CopyField label="Alias" value={transfer.alias} />
          {transfer.holder && <CopyField label="Titular" value={transfer.holder} />}
          {transfer.bank && <CopyField label="Banco" value={transfer.bank} />}
        </div>
      </section>

      {/* Planes */}
      <div className="space-y-3 mt-6">
        {plans.map((p) => {
          const current = active && company.planKey === p.key;
          return (
            <div key={p.key} className={`card p-5 ${current ? "border-fg" : ""}`}>
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

              <PlanCheckout
                planKey={p.key}
                planName={p.name}
                price={p.price}
                alias={transfer.alias}
                blocked={!!pending}
                label={current ? "Renovar 30 días" : active ? `Cambiar a ${p.name}` : `Activar ${p.name}`}
              />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-faint mt-4 text-center">
        La membresía dura 30 días desde la aprobación. Si renovás el mismo plan antes del vencimiento, los días se
        suman.
      </p>
    </main>
  );
}
