"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { isPlanActive } from "@/lib/plans";
import { getAdRules, estimateCampaign, OBJECTIVES, REACHES } from "@/lib/ads";
import { trySaveImage } from "@/lib/upload";
import { getOrCreateWallet } from "@/lib/wallet";

const PLAN_DAYS = 30;

/**
 * La empresa envía el comprobante de la transferencia para activar un plan.
 *
 * El pago es manual: no se activa nada acá. Queda una solicitud PENDING que el
 * Super Admin aprueba o rechaza; recién con la aprobación empieza a correr la
 * membresía. Se guarda el precio del momento para que un cambio de tarifa no
 * altere una solicitud ya enviada.
 */
export async function requestPlan(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const key = String(formData.get("planKey") ?? "");

  const plan = await db.plan.findUnique({ where: { key } });
  if (!plan || !plan.active) redirect("/company/plan?error=plan");

  const profile = await db.companyProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/app");

  // Una sola solicitud en revisión por vez: evita comprobantes duplicados.
  const pending = await db.planRequest.findFirst({
    where: { companyId: profile.id, status: "PENDING" },
  });
  if (pending) redirect("/company/plan?error=pendiente");

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/company/plan?error=comprobante");
  }

  const receiptUrl = await trySaveImage(file as File);
  if (!receiptUrl) redirect("/company/plan?error=archivo");

  await db.planRequest.create({
    data: {
      companyId: profile.id,
      planKey: plan.key,
      amount: plan.price,
      days: PLAN_DAYS,
      receiptUrl,
    },
  });

  // El panel de administración muestra el contador de pendientes.
  revalidatePath("/admin", "layout");
  revalidatePath("/company");
  redirect("/company/plan?ok=enviado");
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

  // La campaña se paga con el saldo de la billetera de publicidad.
  const wallet = await getOrCreateWallet(user.id);
  if (wallet.balance < budget) redirect("/ads/new?error=saldo");

  const est = estimateCampaign(budget, days, objective, reach, rules);
  const endsAt = new Date(Date.now() + days * 86_400_000);
  const target = isWorker ? "WORKER" : "COMPANY";

  // Todo en una transacción interactiva: nunca queda una campaña sin cobrar ni
  // un cobro sin campaña. El descuento condicionado a `balance >= budget` evita
  // que dos envíos simultáneos dejen el saldo en negativo.
  await db.$transaction(async (tx) => {
    const charged = await tx.adWallet.updateMany({
      where: { id: wallet.id, balance: { gte: budget } },
      data: { balance: { decrement: budget }, spent: { increment: budget } },
    });
    if (charged.count === 0) throw new Error("SALDO_INSUFICIENTE");

    const campaign = await tx.campaign.create({
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

    await tx.promotion.create({
      data: { userId: user.id, kind: "CAMPAIGN", refId: campaign.id, days, amount: budget },
    });
  });

  await syncSponsorship(user.id, target);

  revalidatePath("/ads");
  revalidatePath("/ads/wallet");
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
