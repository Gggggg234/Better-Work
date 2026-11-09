import { redirect } from "next/navigation";
import { Check, Landmark, Crown } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { listPlans, benefitList, isPlanActive } from "@/lib/plans";
import { getTransferInfo } from "@/lib/settings";
import { subscribePlan, payPlanOnce, cancelSubscription } from "@/lib/actions/billing";
import { billingMode, confirmReturn, getBillingMethods, userSubscriptions } from "@/lib/billing";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { PlanCheckout } from "@/components/company/PlanCheckout";
import { CopyField } from "@/components/CopyField";
import { PageHero } from "@/components/ui/ActionCards";
import { ReturnBanner, SubscriptionStatus, MpPayOptions } from "@/components/billing/BillingParts";

const ERRORS: Record<string, string> = {
  plan: "Ese plan no está disponible.",
  pendiente: "Ya tenés un comprobante en revisión. Esperá la respuesta antes de enviar otro.",
  comprobante: "Adjuntá el comprobante de la transferencia.",
  archivo: "No pudimos leer ese archivo. Subí una imagen (JPG, PNG o WEBP) de hasta 8 MB.",
  mp: "Mercado Pago no pudo iniciar el pago. Probá de nuevo en un rato o pagá por transferencia.",
  email: "Revisá el email de tu cuenta de Mercado Pago.",
  metodo: "Ese medio de pago no está disponible en este momento.",
};

export default async function CompanyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; mp?: string; payment_id?: string; collection_id?: string; sid?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "COMPANY" || !me.companyProfile) redirect("/app");
  const sp = await searchParams;

  const result = await confirmReturn(me.id, sp);
  const mode = billingMode();
  const methods = await getBillingMethods();

  const [plans, company, transfer, subs] = await Promise.all([
    listPlans(),
    db.companyProfile.findUnique({ where: { userId: me.id } }),
    getTransferInfo(),
    userSubscriptions(me.id, "PLAN"),
  ]);
  if (!company) redirect("/app");

  const active = isPlanActive(company.planActiveUntil);
  const authorized = subs.find((s) => s.status === "AUTHORIZED");

  const [pending, lastRejected] = await Promise.all([
    db.planRequest.findFirst({ where: { companyId: company.id, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    db.planRequest.findFirst({ where: { companyId: company.id, status: "REJECTED" }, orderBy: { reviewedAt: "desc" } }),
  ]);

  const planName = (key: string | null) => plans.find((p) => p.key === key)?.name ?? key ?? "";
  // El plan del medio es el recomendado (el más elegido en este tipo de tablas).
  const featured = plans.length >= 3 ? plans[1]?.key : null;

  return (
    <main className="w-full animate-fade-up">
      <PageHero
        eyebrow="Membresía de empresa"
        title={active ? `Plan ${planName(company.planKey)}` : "Elegí tu plan"}
        subtitle={
          active
            ? `Activo hasta el ${formatDate(company.planActiveUntil!)}.`
            : "Publicá empleos, recibí postulantes y aparecé primero. Los profesionales usan Manobra gratis."
        }
      />

      <div className="max-w-lg mx-auto px-4 -mt-8 relative space-y-4 pb-4">
        <ReturnBanner result={result} />
        {sp.ok === "enviado" && (
          <div className="card p-4 !border-success/30">
            <p className="text-sm font-bold text-success">✓ Recibimos tu comprobante</p>
            <p className="text-xs text-muted mt-0.5">Lo revisamos a la brevedad. Te avisamos por email apenas se apruebe.</p>
          </div>
        )}
        {sp.error && ERRORS[sp.error] && (
          <div className="card p-4 !border-danger/30" role="alert">
            <p className="text-sm font-semibold text-danger">{ERRORS[sp.error]}</p>
          </div>
        )}

        {subs.map((s) => (
          <SubscriptionStatus
            key={s.id}
            sub={s}
            title={`Suscripción · Plan ${planName(s.planKey)}`}
            cancelAction={cancelSubscription.bind(null, s.id)}
          />
        ))}

        {/* Planes */}
        {plans.map((p) => {
          const current = active && company.planKey === p.key;
          const isFeatured = p.key === featured;
          const subscribedHere = authorized?.planKey === p.key;
          return (
            <section
              key={p.key}
              className={`card p-5 relative overflow-hidden ${isFeatured ? "!border-accent/40 shadow-glow" : ""} ${current ? "!border-success/40" : ""}`}
            >
              {isFeatured && <div className="absolute inset-x-0 top-0 h-1 bg-brand" aria-hidden />}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-extrabold text-xl tracking-tight">{p.name}</h2>
                    {isFeatured && (
                      <span className="badge bg-brand text-brand-fg">
                        <Crown className="w-3 h-3" aria-hidden /> Recomendado
                      </span>
                    )}
                    {current && <span className="badge badge-success">Tu plan</span>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{p.tagline}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-2xl tracking-tight">{formatMoney(p.price)}</p>
                  <p className="text-[11px] text-faint">por mes</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {benefitList(p).map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <span className="w-5 h-5 rounded-full bg-success/12 text-success flex items-center justify-center shrink-0 mt-px">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                <MpPayOptions
                  mode={methods === "transfer" ? "off" : mode}
                  subscribeAction={subscribePlan}
                  onceAction={payPlanOnce}
                  hidden={{ planKey: p.key }}
                  defaultEmail={me.email}
                  price={p.price}
                  subscribed={subscribedHere}
                />
              </div>
            </section>
          );
        })}

        {/* Transferencia (alternativa manual) */}
        {methods !== "mp" && (
        <details className="card group" open={methods === "transfer" ? true : undefined}>
          <summary className="list-none cursor-pointer flex items-center gap-3 p-4">
            <span className="icon-tile w-10 h-10 bg-surface-2 text-fg">
              <Landmark className="w-5 h-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">Pagar por transferencia</span>
              <span className="block text-xs text-muted">Subís el comprobante y lo aprobamos a mano</span>
            </span>
          </summary>
          <div className="px-4 pb-4 space-y-3 border-t border-line pt-4">
            {pending && (
              <p className="text-xs rounded-xl bg-warning/10 text-warning font-semibold p-3">
                Comprobante del plan {planName(pending.planKey)} por {formatMoney(pending.amount)} enviado el{" "}
                {formatDateTime(pending.createdAt)}: en revisión.
              </p>
            )}
            {!pending && lastRejected && (
              <p className="text-xs rounded-xl bg-danger/8 text-danger font-semibold p-3">
                Tu último comprobante fue rechazado{lastRejected.note ? `: ${lastRejected.note}` : "."}
              </p>
            )}
            <div className="space-y-2">
              <CopyField label="Alias" value={transfer.alias} />
              {transfer.holder && <CopyField label="Titular" value={transfer.holder} />}
              {transfer.bank && <CopyField label="Banco" value={transfer.bank} />}
            </div>
            {plans.map((p) => (
              <PlanCheckout
                key={p.key}
                planKey={p.key}
                planName={p.name}
                price={p.price}
                alias={transfer.alias}
                blocked={!!pending}
                label={`Transferí y activá ${p.name}`}
              />
            ))}
          </div>
        </details>
        )}

        <p className="text-xs text-faint text-center px-4">
          Cada pago suma 30 días. Renovar el mismo plan antes del vencimiento acumula días; cambiar de plan reinicia el
          período.
        </p>
      </div>
    </main>
  );
}
