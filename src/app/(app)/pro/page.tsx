import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTransferInfo } from "@/lib/settings";
import { isPro, getProConfig, proBenefits, bidsThisMonth } from "@/lib/pro";
import { requestPro } from "@/lib/actions/pro";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { PlanCheckout } from "@/components/company/PlanCheckout";
import { CopyField } from "@/components/CopyField";
import { BackButton } from "@/components/BackButton";

const ERRORS: Record<string, string> = {
  pendiente: "Ya tenés un comprobante en revisión. Esperá la respuesta antes de enviar otro.",
  comprobante: "Adjuntá el comprobante de la transferencia.",
  archivo: "No pudimos leer ese archivo. Subí una imagen (JPG, PNG o WEBP) de hasta 8 MB.",
};

export default async function ProPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "WORKER" || !me.workerProfile) redirect("/app");
  const sp = await searchParams;

  const [config, transfer, used, pending, lastRejected] = await Promise.all([
    getProConfig(),
    getTransferInfo(),
    bidsThisMonth(me.id),
    db.proRequest.findFirst({ where: { userId: me.id, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    db.proRequest.findFirst({ where: { userId: me.id, status: "REJECTED" }, orderBy: { reviewedAt: "desc" } }),
  ]);
  const proUntil = me.workerProfile.proUntil;
  const active = isPro(proUntil);

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <BackButton fallback="/app" />
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Better Work Pro</h1>
        <span className="rounded-full bg-fg text-bg px-2 py-0.5 text-[11px] font-bold">PRO</span>
      </div>
      <p className="text-sm text-muted mt-1">Más visibilidad y más presupuestos, para conseguir más trabajos.</p>

      {sp.ok === "enviado" && (
        <div className="card p-4 mt-5 bg-fg text-bg">
          <p className="text-sm font-medium">✓ Recibimos tu comprobante</p>
          <p className="text-xs text-bg/70 mt-0.5">Lo revisamos a la brevedad y te avisamos apenas se active.</p>
        </div>
      )}
      {sp.error && ERRORS[sp.error] && (
        <div className="card p-4 mt-5 border-red-300" role="alert">
          <p className="text-sm text-red-600">⚠ {ERRORS[sp.error]}</p>
        </div>
      )}

      {active ? (
        <div className="card p-4 mt-5 border-fg bg-surface-2">
          <p className="text-sm font-medium">Sos Pro hasta el {formatDate(proUntil!)}</p>
          <p className="text-xs text-muted mt-0.5">Si renovás antes del vencimiento, los días se suman.</p>
        </div>
      ) : (
        <div className="card p-4 mt-5">
          <p className="text-sm font-medium">Plan gratuito</p>
          <p className="text-xs text-muted mt-0.5">
            Este mes mandaste {Math.min(used, config.freeBids)} de {config.freeBids} presupuestos a pedidos abiertos.
          </p>
        </div>
      )}

      {pending && (
        <div className="card p-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fg animate-pulse" aria-hidden />
            <p className="text-sm font-medium">Pendiente de aprobación</p>
          </div>
          <p className="text-xs text-muted mt-1">
            Enviaste el comprobante por {formatMoney(pending.amount)} el {formatDateTime(pending.createdAt)}.
          </p>
        </div>
      )}
      {!pending && lastRejected && (
        <div className="card p-4 mt-3 border-red-300">
          <p className="text-sm font-medium text-red-600">Tu último comprobante fue rechazado</p>
          {lastRejected.note && <p className="text-xs text-muted mt-1">Motivo: {lastRejected.note}</p>}
          <p className="text-xs text-muted mt-1">Podés volver a enviarlo desde acá.</p>
        </div>
      )}

      <section className="card p-5 mt-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-lg">Pro</h2>
          <div className="text-right shrink-0">
            <p className="font-bold text-lg">{formatMoney(config.price)}</p>
            <p className="text-[11px] text-faint">por mes</p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {proBenefits(config.freeBids).map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <span className="text-fg mt-0.5">✓</span>
              <span className="text-muted">{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 space-y-2">
          <p className="text-xs text-muted">Se paga por transferencia. Datos para transferir:</p>
          <CopyField label="Alias" value={transfer.alias} />
          {transfer.holder && <CopyField label="Titular" value={transfer.holder} />}
        </div>

        <PlanCheckout
          action={requestPro}
          planName="Pro"
          price={config.price}
          alias={transfer.alias}
          blocked={!!pending}
          label={active ? "Renovar 30 días" : "Activar Pro"}
        />
      </section>

      <p className="text-xs text-faint mt-4 text-center">
        Pro dura 30 días desde la aprobación. Sin Pro seguís usando Better Work gratis.
      </p>
    </main>
  );
}
