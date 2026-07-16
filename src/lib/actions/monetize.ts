"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import type { ChargeSubject } from "@/lib/payments";
import { fulfillCharge } from "@/lib/payments/fulfill";
import { getCompanyPlanPrice, getPromoPrice, PROMO_DURATIONS, type PromoDays } from "@/lib/pricing";

const PLAN_DAYS = 30;

/**
 * Cobra e impacta una compra (plan o publicidad). Con Mercado Pago manda al
 * checkout y el webhook aplica el efecto; con el proveedor simulado se aplica
 * al instante. Devuelve la URL a la que hay que redirigir, si corresponde.
 */
async function purchase(
  subject: ChargeSubject,
  payerId: string,
  amount: number,
  description: string,
  errorUrl: string
): Promise<string | null> {
  const result = await getPaymentProvider().charge({ subject, payerId, amount, description });
  if (!result.ok) redirect(`${errorUrl}?error=pago`);
  if (result.kind === "redirect") return result.redirectUrl;
  await fulfillCharge(subject, result.providerRef, payerId, amount);
  return null;
}

/** La empresa activa/renueva su plan Premium. */
export async function activateCompanyPlan(): Promise<void> {
  const user = await requireRole("COMPANY");
  const profile = await db.companyProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return;

  const amount = await getCompanyPlanPrice();
  const redirectUrl = await purchase(
    { type: "COMPANY_PLAN", companyProfileId: profile.id, days: PLAN_DAYS },
    user.id,
    amount,
    "Plan Premium Better Work (empresa)",
    "/company/plan"
  );
  if (redirectUrl) redirect(redirectUrl);

  revalidatePath("/company");
  redirect("/company?ok=plan");
}

function validDays(raw: string): PromoDays {
  const d = parseInt(raw);
  return (PROMO_DURATIONS as readonly number[]).includes(d) ? (d as PromoDays) : 7;
}

/** Trabajador destaca su perfil. */
export async function promoteWorkerProfile(formData: FormData): Promise<void> {
  const user = await requireRole("WORKER");
  const days = validDays(String(formData.get("days") ?? "7"));
  const profile = await db.workerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return;

  const amount = await getPromoPrice(days);
  const url = await purchase(
    { type: "PROMO", kind: "PROFILE", refId: profile.id, days },
    user.id,
    amount,
    `Perfil destacado ${days} días`,
    "/promote"
  );
  if (url) redirect(url);

  revalidatePath("/promote");
  redirect("/promote?ok=1");
}

/** Empresa destaca su perfil empresarial (requiere plan activo). */
export async function promoteCompanyProfile(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const days = validDays(String(formData.get("days") ?? "7"));
  const profile = await db.companyProfile.findUnique({ where: { userId: user.id } });
  if (!profile || !profile.planActiveUntil || profile.planActiveUntil < new Date()) redirect("/company/plan");

  const amount = await getPromoPrice(days);
  const url = await purchase(
    { type: "PROMO", kind: "PROFILE", refId: profile.id, days },
    user.id,
    amount,
    `Empresa destacada ${days} días`,
    "/promote"
  );
  if (url) redirect(url);

  revalidatePath("/promote");
  redirect("/promote?ok=1");
}

/** Empresa destaca una oferta suya. */
export async function promoteOffer(offerId: string, formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const days = validDays(String(formData.get("days") ?? "7"));
  const offer = await db.jobOffer.findUnique({ where: { id: offerId }, include: { company: true } });
  if (!offer || offer.company.userId !== user.id) return;

  const amount = await getPromoPrice(days);
  const url = await purchase(
    { type: "PROMO", kind: "OFFER", refId: offerId, days },
    user.id,
    amount,
    `Oferta destacada ${days} días`,
    "/company"
  );
  if (url) redirect(url);

  revalidatePath("/company");
}

/** Cualquier autor destaca una publicación suya del feed. */
export async function promotePost(postId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const days = validDays(String(formData.get("days") ?? "7"));
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) return;

  const amount = await getPromoPrice(days);
  const url = await purchase(
    { type: "PROMO", kind: "POST", refId: postId, days },
    user.id,
    amount,
    `Publicación destacada ${days} días`,
    `/feed/${postId}`
  );
  if (url) redirect(url);

  revalidatePath("/feed");
  revalidatePath(`/feed/${postId}`);
}
