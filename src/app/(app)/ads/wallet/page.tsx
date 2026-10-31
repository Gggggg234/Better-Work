import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateWallet, TOPUP_STATUS, TOPUP_PRESETS, MIN_TOPUP } from "@/lib/wallet";
import { topUpWithMp } from "@/lib/actions/billing";
import { billingMode, confirmReturn } from "@/lib/billing";
import { ReturnBanner } from "@/components/billing/BillingParts";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { getTransferInfo } from "@/lib/settings";
import { formatMoney, formatDateTime } from "@/lib/format";
import { BackButton } from "@/components/BackButton";
import { CopyField } from "@/components/CopyField";
import { TopUpForm } from "@/components/ads/TopUpForm";

const ERRORS: Record<string, string> = {
  monto: "El monto mínimo de carga es $1.000.",
  pendiente: "Ya tenés una carga en revisión. Esperá la respuesta antes de enviar otra.",
  comprobante: "Adjuntá el comprobante de la transferencia.",
  archivo: "No pudimos leer ese archivo. Subí una imagen (JPG, PNG o WEBP) de hasta 8 MB.",
  mp: "Mercado Pago no pudo iniciar el pago. Probá de nuevo en un rato o cargá por transferencia.",
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; mp?: string; payment_id?: string; collection_id?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "WORKER" && me.role !== "COMPANY") redirect("/app");
  const sp = await searchParams;

  // La vuelta de Mercado Pago se verifica antes de leer el saldo (puede acreditarlo ahora).
  const result = await confirmReturn(me.id, sp);
  const mode = billingMode();

  const [wallet, transfer] = await Promise.all([getOrCreateWallet(me.id), getTransferInfo()]);

  const topUps = await db.walletTopUp.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const pending = topUps.find((t) => t.status === "PENDING");

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <BackButton fallback="/ads" />
      <h1 className="text-2xl font-bold mt-2">Presupuesto publicitario</h1>
      <p className="text-sm text-muted mt-1">
        Cargá saldo y usalo para tus campañas cuando quieras.
      </p>

      <div className="mt-5">
        <ReturnBanner result={result} />
      </div>

      {sp.ok === "enviado" && (
        <div className="card p-4 mt-5 bg-fg text-bg">
          <p className="text-sm font-medium">✓ Recibimos tu comprobante</p>
          <p className="text-xs text-bg/70 mt-0.5">
            Acreditamos el saldo apenas lo validemos. Vas a verlo reflejado acá.
          </p>
        </div>
      )}
      {sp.error && ERRORS[sp.error] && (
        <div className="card p-4 mt-5 border-red-300" role="alert">
          <p className="text-sm text-red-600">⚠ {ERRORS[sp.error]}</p>
        </div>
      )}

      {/* Saldo */}
      <div className="relative overflow-hidden rounded-[22px] p-6 mt-5 bg-brand text-white shadow-glow">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Saldo disponible</p>
        <p className="text-4xl font-extrabold tracking-tight mt-1">{formatMoney(wallet.balance)}</p>
        <p className="text-xs text-white/70 mt-2">Invertido en campañas: {formatMoney(wallet.spent)}</p>
      </div>

      {/* Carga al instante con Mercado Pago */}
      {mode !== "off" && (
        <section className="card p-5 mt-5">
          <h2 className="font-bold">Cargar con Mercado Pago</h2>
          <p className="text-sm text-muted mt-1">Se acredita al instante con tarjeta o dinero en cuenta.</p>
          <form action={topUpWithMp} className="mt-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {TOPUP_PRESETS.map((v, i) => (
                <label
                  key={v}
                  className="cursor-pointer rounded-2xl border border-line py-2.5 text-center text-sm font-bold transition has-[:checked]:border-accent has-[:checked]:bg-accent/8 has-[:checked]:text-accent"
                >
                  <input type="radio" name="amount" value={v} defaultChecked={i === 1} className="sr-only" />
                  {formatMoney(v).replace(/,00$/, "")}
                </label>
              ))}
            </div>
            <FormSubmitButton pendingLabel="Abriendo Mercado Pago…">Cargar saldo</FormSubmitButton>
            <p className="text-[11px] text-faint text-center">
              {mode === "simulated" ? "Modo prueba (desarrollo): no se cobra de verdad." : `Mínimo ${formatMoney(MIN_TOPUP)}.`}
            </p>
          </form>
        </section>
      )}

      {pending && (
        <div className="card p-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fg animate-pulse" aria-hidden />
            <p className="text-sm font-medium">Carga pendiente de aprobación</p>
          </div>
          <p className="text-xs text-muted mt-1">
            Enviaste {formatMoney(pending.amount)} el {formatDateTime(pending.createdAt)}. Un administrador lo va a
            revisar.
          </p>
        </div>
      )}

      {/* Cómo cargar */}
      <section className="card p-5 mt-5">
        <h2 className="font-semibold">{mode === "off" ? "Cómo cargar saldo" : "O cargá por transferencia"}</h2>
        <p className="text-sm text-muted mt-1">
          Transferí el monto que quieras cargar y subí el comprobante. Acreditamos el saldo cuando lo validemos.
        </p>
        <div className="mt-4 space-y-2">
          <CopyField label="Alias" value={transfer.alias} />
          {transfer.holder && <CopyField label="Titular" value={transfer.holder} />}
          {transfer.bank && <CopyField label="Banco" value={transfer.bank} />}
        </div>
      </section>

      <TopUpForm alias={transfer.alias} blocked={!!pending} />

      {/* Historial */}
      {topUps.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Historial de cargas</h2>
          <div className="card divide-y divide-line">
            {topUps.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{formatMoney(t.amount)}</p>
                  <p className="text-xs text-faint truncate">
                    {formatDateTime(t.createdAt)}
                    {t.note && ` · ${t.note}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${
                    t.status === "APPROVED" ? "bg-success/12 text-success" : t.status === "REJECTED" ? "bg-danger/12 text-danger" : "bg-surface-2 text-muted"
                  }`}
                >
                  {TOPUP_STATUS[t.status] ?? t.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
