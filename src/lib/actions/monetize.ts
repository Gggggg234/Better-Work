"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import { getCompanyPlanPrice, getPromoPrice, PROMO_DURATIONS, type PromoDays } from "@/lib/pricing";

const PLAN_DAYS = 30;

function extend(current: Date | null | undefined, days: number): Date {
  const base = current && current > new Date() ? current : new Date();
  return new Date(base.getTime() + days * 86_400_000);
}

/**
 * La empresa activa/renueva su plan Premium. Cobra vía el proveedor de pagos
 * (hoy simulado) y extiende planActiveUntil. Registra la venta para el admin.
 */
export async function activateCompanyPlan(): Promise<void> {
  const user = await requireRole("COMPANY");
  const profile = await db.companyProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return;

  const amount = await getCompanyPlanPrice();
  const result = await getPaymentProvider().charge({
    jobId: `plan_${profile.id}`,
    payerId: user.id,
    amount,
    description: "Plan Premium Better Work (empresa)",
  });
  if (!result.ok) redirect("/company/plan?error=pago");

  await db.$transaction([
    db.companyProfile.update({
      where: { id: profile.id },
      data: { planActiveUntil: extend(profile.planActiveUntil, PLAN_DAYS) },
    }),
    db.promotion.create({
      data: { userId: user.id, kind: "COMPANY_PLAN", refId: profile.id, days: PLAN_DAYS, amount, providerRef: result.providerRef },
    }),
  ]);

  revalidatePath("/company");
  redirect("/company?ok=plan");
}

function validDays(raw: string): PromoDays {
  const d = parseInt(raw);
  return (PROMO_DURATIONS as readonly number[]).includes(d) ? (d as PromoDays) : 7;
}

/** Charge + registro de una publicidad. Devuelve la fecha de vencimiento nueva. */
async function chargePromo(userId: string, kind: string, refId: string, days: PromoDays): Promise<Date | null> {
  const amount = await getPromoPrice(days);
  const result = await getPaymentProvider().charge({
    jobId: `promo_${kind}_${refId}`,
    payerId: userId,
    amount,
    description: `Publicidad Better Work (${kind}, ${days} días)`,
  });
  if (!result.ok) return null;
  await db.promotion.create({
    data: { userId, kind, refId, days, amount, providerRef: result.providerRef },
  });
  return new Date(); // marcador; el caller calcula el extend real
}

/** Trabajador destaca su perfil. */
export async function promoteWorkerProfile(formData: FormData): Promise<void> {
  const user = await requireRole("WORKER");
  const days = validDays(String(formData.get("days") ?? "7"));
  const profile = await db.workerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return;
  const ok = await chargePromo(user.id, "PROFILE", profile.id, days);
  if (!ok) redirect("/promote?error=pago");
  await db.workerProfile.update({
    where: { id: profile.id },
    data: { sponsoredUntil: extend(profile.sponsoredUntil, days) },
  });
  revalidatePath("/promote");
  redirect("/promote?ok=1");
}

/** Empresa destaca su perfil empresarial (requiere plan activo). */
export async function promoteCompanyProfile(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const days = validDays(String(formData.get("days") ?? "7"));
  const profile = await db.companyProfile.findUnique({ where: { userId: user.id } });
  if (!profile || !profile.planActiveUntil || profile.planActiveUntil < new Date()) redirect("/company/plan");
  const ok = await chargePromo(user.id, "PROFILE", profile.id, days);
  if (!ok) redirect("/promote?error=pago");
  await db.companyProfile.update({
    where: { id: profile.id },
    data: { sponsoredUntil: extend(profile.sponsoredUntil, days) },
  });
  revalidatePath("/promote");
  redirect("/promote?ok=1");
}

/** Empresa destaca una oferta suya. */
export async function promoteOffer(offerId: string, formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const days = validDays(String(formData.get("days") ?? "7"));
  const offer = await db.jobOffer.findUnique({ where: { id: offerId }, include: { company: true } });
  if (!offer || offer.company.userId !== user.id) return;
  const ok = await chargePromo(user.id, "OFFER", offerId, days);
  if (!ok) redirect("/company?error=pago");
  await db.jobOffer.update({ where: { id: offerId }, data: { promotedUntil: extend(offer.promotedUntil, days) } });
  revalidatePath("/company");
}

/** Cualquier autor destaca una publicación suya del feed. */
export async function promotePost(postId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const days = validDays(String(formData.get("days") ?? "7"));
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) return;
  const ok = await chargePromo(user.id, "POST", postId, days);
  if (!ok) redirect(`/feed/${postId}?error=pago`);
  await db.post.update({ where: { id: postId }, data: { sponsoredUntil: extend(post.sponsoredUntil, days) } });
  revalidatePath("/feed");
  revalidatePath(`/feed/${postId}`);
}
