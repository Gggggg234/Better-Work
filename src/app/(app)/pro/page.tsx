import { redirect } from "next/navigation";
import { Sparkles, Check, TrendingUp, Infinity as InfinityIcon, BadgeCheck, Landmark } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTransferInfo } from "@/lib/settings";
import { isPro, getProConfig, proBenefits, bidsThisMonth } from "@/lib/pro";
import { requestPro } from "@/lib/actions/pro";
import { subscribePro, payProOnce, cancelSubscription } from "@/lib/actions/billing";
import { billingMode, confirmReturn, userSubscriptions } from "@/lib/billing";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { PlanCheckout } from "@/components/company/PlanCheckout";
import { CopyField } from "@/components/CopyField";
import { BackButton } from "@/components/BackButton";
import { ReturnBanner, SubscriptionStatus, MpPayOptions } from "@/components/billing/BillingParts";

const ERRORS: Record<string, string> = {
  pendiente: "Ya tenés un comprobante en revisión. Esperá la respuesta antes de enviar otro.",
  comprobante: "Adjuntá el comprobante de la transferencia.",
  archivo: "No pudimos leer ese archivo. Subí una imagen (JPG, PNG o WEBP) de hasta 8 MB.",
  mp: "Mercado Pago no pudo iniciar el pago. Probá de nuevo en un rato o pagá por transferencia.",
  email: "Revisá el email de tu cuenta de Mercado Pago.",
};

const PERKS = [
  { icon: TrendingUp, title: "Más arriba", desc: "En las búsquedas y en el mapa" },
  { icon: InfinityIcon, title: "Sin límite", desc: "Presupuestos a pedidos abiertos" },
  { icon: BadgeCheck, title: "Insignia PRO", desc: "En tu perfil y presupuestos" },
];

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; mp?: string; payment_id?: string; collection_id?: string; sid?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "WORKER" || !me.workerProfile) redirect("/app");
  const sp = await searchParams;

  // Primero se confirma la vuelta de Mercado Pago (puede activar Pro ahora mismo).
  const result = await confirmReturn(me.id, sp);
  const mode = billingMode();

  const [config, transfer, used, pending, lastRejected, subs, profile] = await Promise.all([
    getProConfig(),
    getTransferInfo(),
    bidsThisMonth(me.id),
    db.proRequest.findFirst({ where: { userId: me.id, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    db.proRequest.findFirst({ where: { userId: me.id, status: "REJECTED" }, orderBy: { reviewedAt: "desc" } }),
    userSubscriptions(me.id, "PRO"),
    db.workerProfile.findUnique({ where: { userId: me.id }, select: { proUntil: true } }),
  ]);
  const proUntil = profile?.proUntil ?? null;
  const active = isPro(proUntil);
  const authorized = subs.find((s) => s.status === "AUTHORIZED");

  return (
    <main className="w-full animate-fade-up">
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
        <div className="absolute -right-10 top-6 w-48 h-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative max-w-lg mx-auto px-5 pt-4 pb-20">
          <div className="[&_*]:!text-white/80">
            <BackButton fallback="/app" />
          </div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" aria-hidden /> MANOBRA PRO
          </p>
          <h1 className="text-[30px] leading-tight font-extrabold tracking-tight mt-3">
            {active ? "Sos Pro" : "Conseguí más trabajos"}
          </h1>
          <p className="text-sm text-white/80 mt-1.5">
            {active
              ? `Tu Pro está activo hasta el ${formatDate(proUntil!)}.`
              : "Más visibilidad y presupuestos sin límite, por menos de lo que cobrás en una visita."}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-5">
            {PERKS.map((p) => (
              <div key={p.title} className="rounded-2xl bg-white/10 backdrop-blur p-3">
                <p.icon className="w-5 h-5" aria-hidden />
                <p className="text-sm font-extrabold mt-2 leading-tight">{p.title}</p>
                <p className="text-[11px] text-white/70 leading-snug">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-lg mx-auto px-4 -mt-10 relative space-y-4 pb-4">
        <ReturnBanner result={result} />
        {sp.ok === "enviado" && (
          <div className="card p-4 !border-success/30">
            <p className="text-sm font-bold text-success">✓ Recibimos tu comprobante</p>
            <p className="text-xs text-muted mt-0.5">Lo revisamos a la brevedad y te avisamos apenas se active.</p>
          </div>
        )}
        {sp.error && ERRORS[sp.error] && (
          <div className="card p-4 !border-danger/30" role="alert">
            <p className="text-sm font-semibold text-danger">{ERRORS[sp.error]}</p>
          </div>
        )}

        {/* Débito automático vigente */}
        {subs.map((s) => (
          <SubscriptionStatus key={s.id} sub={s} title="Suscripción a Pro" cancelAction={cancelSubscription.bind(null, s.id)} />
        ))}

        {/* Precio y cómo pagar */}
        <section className="card p-5 !border-accent/30 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand" aria-hidden />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-accent">Pro mensual</p>
              <p className="text-4xl font-extrabold tracking-tight mt-1">{formatMoney(config.price)}</p>
              <p className="text-xs text-muted">por mes · cancelás cuando quieras</p>
            </div>
            {!active && (
              <p className="text-right text-xs text-muted">
                Este mes usaste
                <br />
                <span className="font-extrabold text-fg text-base">
                  {Math.min(used, config.freeBids)}/{config.freeBids}
                </span>{" "}
                presupuestos
              </p>
            )}
          </div>

          <ul className="mt-4 space-y-2">
            {proBenefits(config.freeBids).map((b) => (
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
              mode={mode}
              subscribeAction={subscribePro}
              onceAction={payProOnce}
              defaultEmail={me.email}
              price={config.price}
              subscribed={!!authorized}
            />
          </div>
        </section>

        {/* Transferencia (alternativa manual) */}
        <details className="card group" open={mode === "off" ? true : undefined}>
          <summary className="list-none cursor-pointer flex items-center gap-3 p-4">
            <span className="icon-tile w-10 h-10 bg-surface-2 text-fg">
              <Landmark className="w-5 h-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">Pagar por transferencia</span>
              <span className="block text-xs text-muted">Subís el comprobante y lo aprobamos a mano</span>
            </span>
          </summary>
          <div className="px-4 pb-4 space-y-2 border-t border-line pt-4">
            {pending && (
              <p className="text-xs rounded-xl bg-warning/10 text-warning font-semibold p-3">
                Comprobante por {formatMoney(pending.amount)} enviado el {formatDateTime(pending.createdAt)}: en revisión.
              </p>
            )}
            {!pending && lastRejected && (
              <p className="text-xs rounded-xl bg-danger/8 text-danger font-semibold p-3">
                Tu último comprobante fue rechazado{lastRejected.note ? `: ${lastRejected.note}` : "."}
              </p>
            )}
            <CopyField label="Alias" value={transfer.alias} />
            {transfer.holder && <CopyField label="Titular" value={transfer.holder} />}
            <PlanCheckout
              action={requestPro}
              planName="Pro"
              price={config.price}
              alias={transfer.alias}
              blocked={!!pending}
              label={active ? "Renovar 30 días" : "Activar Pro"}
            />
          </div>
        </details>

        <p className="text-xs text-faint text-center px-4">
          Cada pago suma 30 días. Si renovás antes del vencimiento, los días se acumulan. Sin Pro seguís usando Better
          Work gratis.
        </p>
      </div>
    </main>
  );
}
