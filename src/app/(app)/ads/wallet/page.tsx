import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateWallet, TOPUP_STATUS } from "@/lib/wallet";
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
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "WORKER" && me.role !== "COMPANY") redirect("/app");
  const sp = await searchParams;

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
        Cargá saldo por transferencia y usalo para tus campañas cuando quieras.
      </p>

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
      <div className="card p-6 mt-5 bg-fg text-bg">
        <p className="text-xs uppercase tracking-wide text-bg/60">Saldo disponible</p>
        <p className="text-4xl font-bold mt-1">{formatMoney(wallet.balance)}</p>
        <p className="text-xs text-bg/60 mt-2">Invertido en campañas: {formatMoney(wallet.spent)}</p>
      </div>

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
        <h2 className="font-semibold">Cómo cargar saldo</h2>
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
                    t.status === "APPROVED" ? "bg-fg text-bg" : "bg-surface-2 text-muted"
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
