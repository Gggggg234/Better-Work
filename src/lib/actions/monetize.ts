"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { isPlanActive } from "@/lib/plans";
import { getAdRules, estimateCampaign, OBJECTIVES, REACHES } from "@/lib/ads";

const PLAN_DAYS = 30;

function extend(current: Date | null | undefined, days: number): Date {
  const base = current && current > new Date() ? current : new Date();
  return new Date(base.getTime() + days * 86_400_000);
}

/**
 * La empresa activa o cambia su membresía.
 *
 * Todavía no hay pasarela de pagos: la membresía se activa y el cobro se
 * arregla fuera de la app. La compra queda registrada para la contabilidad
 * (panel Super Admin → Ingresos).
 */
export async function activatePlan(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const key = String(formData.get("planKey") ?? "");
  const plan = await db.plan.findUnique({ where: { key } });
  if (!plan || !plan.active) redirect("/company/plan?error=plan");

  const profile = await db.companyProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return;

  // Cambiar de plan reinicia el período; renovar el mismo suma días.
  const samePlan = profile.planKey === plan.key;
  const until = samePlan
    ? extend(profile.planActiveUntil, PLAN_DAYS)
    : new Date(Date.now() + PLAN_DAYS * 86_400_000);

  await db.$transaction([
    db.companyProfile.update({
      where: { id: profile.id },
      data: {
        planKey: plan.key,
        planActiveUntil: until,
        // La insignia verificada es un beneficio del plan.
        verified: plan.verifiedBadge ? true : profile.verified,
      },
    }),
    db.promotion.create({
      data: { userId: user.id, kind: "COMPANY_PLAN", refId: plan.key, days: PLAN_DAYS, amount: plan.price },
    }),
  ]);

  revalidatePath("/company");
  redirect("/company?ok=plan");
}

/**
 * Recalcula el patrocinio del perfil a partir de TODAS las campañas activas.
 *
 * El perfil es una denormalización (el ranking lee de ahí con una sola
 * consulta), así que se deriva del conjunto: vale el empuje más alto y la
 * fecha de fin más lejana. Nunca se pisa con los datos de una sola campaña,
 * porque un usuario puede tener varias corriendo a la vez.
 */
async function syncSponsorship(userId: string, target: string): Promise<void> {
  const active = await db.campaign.findMany({
    where: { userId, target, status: "ACTIVE", endsAt: { gt: new Date() } },
    select: { boost: true, endsAt: true },
  });

  const data = active.length
    ? {
        sponsoredUntil: new Date(Math.max(...active.map((c) => c.endsAt.getTime()))),
        sponsorBoost: Math.max(...active.map((c) => c.boost)),
      }
    : { sponsoredUntil: null, sponsorBoost: 0 };

  if (target === "WORKER") await db.workerProfile.updateMany({ where: { userId }, data });
  else await db.companyProfile.updateMany({ where: { userId }, data });
}

/**
 * Crea una campaña publicitaria. El empuje y la duración se denormalizan en el
 * perfil para que el ranking siga siendo una sola consulta.
 */
export async function createCampaign(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "WORKER" && user.role !== "COMPANY") redirect("/app");

  const budget = Math.round(parseFloat(String(formData.get("budget") ?? "0")) || 0);
  const days = Math.max(1, parseInt(String(formData.get("days") ?? "7")) || 7);
  const objective = String(formData.get("objective") ?? "VISIBILITY");
  const reach = String(formData.get("reach") ?? "CITY");

  if (!OBJECTIVES.some((o) => o.value === objective)) redirect("/ads/new?error=datos");
  if (!REACHES.some((r) => r.value === reach)) redirect("/ads/new?error=datos");

  const rules = await getAdRules();
  if (budget < rules.minBudget) redirect("/ads/new?error=presupuesto");

  const isWorker = user.role === "WORKER";
  const profile = isWorker
    ? await db.workerProfile.findUnique({ where: { userId: user.id } })
    : await db.companyProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/app");

  // Una empresa necesita membresía activa para hacer publicidad.
  if (!isWorker && !isPlanActive((profile as { planActiveUntil: Date | null }).planActiveUntil)) {
    redirect("/company/plan");
  }

  const est = estimateCampaign(budget, days, objective, reach, rules);
  const endsAt = new Date(Date.now() + days * 86_400_000);

  const target = isWorker ? "WORKER" : "COMPANY";
  const campaign = await db.campaign.create({
    data: {
      userId: user.id,
      target,
      objective,
      reach,
      budget,
      days,
      dailyBudget: est.dailyBudget,
      boost: est.boost,
      endsAt,
    },
  });

  await syncSponsorship(user.id, target);

  await db.promotion.create({
    data: { userId: user.id, kind: "CAMPAIGN", refId: campaign.id, days, amount: budget },
  });

  revalidatePath("/ads");
  redirect("/ads?ok=1");
}

/** Corta una campaña antes de tiempo. */
export async function cancelCampaign(campaignId: string): Promise<void> {
  const user = await requireUser();
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.userId !== user.id || campaign.status !== "ACTIVE") return;

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "CANCELLED", endsAt: new Date() },
  });

  // Recalculamos con las campañas que sigan vivas (puede haber más de una).
  await syncSponsorship(user.id, campaign.target);

  revalidatePath("/ads");
  revalidatePath("/app");
}
