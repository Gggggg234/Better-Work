import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createCampaign } from "@/lib/actions/monetize";
import { CampaignBuilder } from "@/components/ads/CampaignBuilder";
import { getAdRules } from "@/lib/ads";
import { isPlanActive } from "@/lib/plans";
import { getWallet } from "@/lib/wallet";
import { formatMoney } from "@/lib/format";
import { BackButton } from "@/components/BackButton";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "WORKER" && me.role !== "COMPANY") redirect("/app");
  const sp = await searchParams;

  // Una empresa necesita membresía activa para publicitar.
  if (me.role === "COMPANY") {
    const c = await db.companyProfile.findUnique({ where: { userId: me.id } });
    if (!isPlanActive(c?.planActiveUntil)) redirect("/company/plan");
  }

  const [rules, wallet] = await Promise.all([getAdRules(), getWallet(me.id)]);

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <BackButton fallback="/ads" />
      <h1 className="text-2xl font-bold mt-2">Nueva campaña</h1>
      <p className="text-sm text-muted mt-1 mb-4">
        Configurá tu campaña y mirá la estimación antes de lanzarla.
      </p>

      {/* Saldo: la campaña se descuenta de acá. */}
      <div className="card p-4 flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-faint">Saldo disponible</p>
          <p className="text-xl font-bold">{formatMoney(wallet.balance)}</p>
        </div>
        <Link href="/ads/wallet" className="btn-secondary shrink-0 !py-1.5 !px-3 !text-xs">Cargar saldo</Link>
      </div>

      {sp.error === "saldo" && (
        <div className="card p-4 mb-3 border-red-300" role="alert">
          <p className="text-sm text-red-600">⚠ No te alcanza el saldo para ese presupuesto.</p>
          <p className="text-xs text-muted mt-0.5">Cargá saldo o bajá el presupuesto de la campaña.</p>
        </div>
      )}
      {sp.error === "presupuesto" && (
        <p className="text-sm text-red-600 mb-3">⚠ El presupuesto es menor al mínimo.</p>
      )}
      {sp.error === "datos" && <p className="text-sm text-red-600 mb-3">⚠ Revisá los datos de la campaña.</p>}

      {wallet.balance < rules.minBudget ? (
        <div className="card p-6 text-center">
          <p className="text-2xl">💳</p>
          <p className="font-semibold mt-2">Necesitás saldo para crear una campaña</p>
          <p className="text-sm text-muted mt-1">
            El presupuesto se descuenta de tu billetera de publicidad. El mínimo por campaña es{" "}
            {formatMoney(rules.minBudget)}.
          </p>
          <Link href="/ads/wallet" className="btn-primary w-full mt-4">Cargar saldo</Link>
        </div>
      ) : (
        <CampaignBuilder rules={rules} action={createCampaign} balance={wallet.balance} />
      )}
    </main>
  );
}
