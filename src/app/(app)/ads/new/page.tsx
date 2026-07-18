import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createCampaign } from "@/lib/actions/monetize";
import { CampaignBuilder } from "@/components/ads/CampaignBuilder";
import { getAdRules } from "@/lib/ads";
import { isPlanActive } from "@/lib/plans";

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

  const rules = await getAdRules();

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <Link href="/ads" className="btn-ghost !px-2 -ml-2 mb-2 !text-sm">← Volver</Link>
      <h1 className="text-2xl font-bold">Nueva campaña</h1>
      <p className="text-sm text-muted mt-1 mb-6">
        Configurá tu campaña y mirá la estimación antes de lanzarla.
      </p>

      {sp.error === "presupuesto" && (
        <p className="text-sm text-red-600 mb-3">El presupuesto es menor al mínimo.</p>
      )}
      {sp.error === "datos" && <p className="text-sm text-red-600 mb-3">Revisá los datos de la campaña.</p>}

      <CampaignBuilder rules={rules} action={createCampaign} />
    </main>
  );
}
