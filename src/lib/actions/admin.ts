"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { setCommissionPct } from "@/lib/commission";
import { savePricing, type PricingKey } from "@/lib/pricing";

/** Guarda el porcentaje de comisión de la plataforma (Super Admin). */
export async function saveCommission(formData: FormData) {
  await requireRole("ADMIN");
  const pct = parseFloat(String(formData.get("commissionPct") ?? ""));
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) return;
  await setCommissionPct(pct);
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

/** Guarda precios del plan de empresa y de la publicidad (Super Admin). */
export async function savePlanAndAdPricing(formData: FormData) {
  await requireRole("ADMIN");
  const keys: PricingKey[] = ["company_plan_price", "promo_price_7", "promo_price_15", "promo_price_30"];
  const entries: Partial<Record<PricingKey, number>> = {};
  for (const k of keys) {
    const v = parseFloat(String(formData.get(k) ?? ""));
    if (Number.isFinite(v) && v >= 0) entries[k] = v;
  }
  await savePricing(entries);
  revalidatePath("/admin/settings");
}

/** Moderación: oculta o vuelve a mostrar una publicación. */
export async function togglePostHidden(postId: string) {
  await requireRole("ADMIN");
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) return;
  await db.post.update({ where: { id: postId }, data: { hidden: !post.hidden } });
  revalidatePath("/admin/posts");
  revalidatePath("/feed");
}

/** Moderación: elimina una publicación denunciada. */
export async function adminDeletePost(postId: string) {
  await requireRole("ADMIN");
  await db.post.deleteMany({ where: { id: postId } });
  revalidatePath("/admin/posts");
  revalidatePath("/feed");
}

export async function resolvePostReport(reportId: string, status: "RESOLVED" | "DISMISSED") {
  await requireRole("ADMIN");
  await db.postReport.update({ where: { id: reportId }, data: { status } });
  revalidatePath("/admin/posts");
}

/** Grant/quita manualmente el plan de una empresa (soporte). */
export async function toggleCompanyPlan(profileId: string) {
  await requireRole("ADMIN");
  const p = await db.companyProfile.findUnique({ where: { id: profileId } });
  if (!p) return;
  const active = p.planActiveUntil && p.planActiveUntil > new Date();
  await db.companyProfile.update({
    where: { id: profileId },
    data: { planActiveUntil: active ? null : new Date(Date.now() + 30 * 86_400_000) },
  });
  revalidatePath("/admin/users");
}

export async function toggleSuspended(userId: string) {
  await requireRole("ADMIN");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "ADMIN") return;
  await db.user.update({ where: { id: userId }, data: { suspended: !user.suspended } });
  revalidatePath("/admin/users");
}

export async function toggleWorkerVerified(profileId: string) {
  await requireRole("ADMIN");
  const p = await db.workerProfile.findUnique({ where: { id: profileId } });
  if (!p) return;
  await db.workerProfile.update({ where: { id: profileId }, data: { verified: !p.verified } });
  revalidatePath("/admin/users");
}

export async function toggleCompanyVerified(profileId: string) {
  await requireRole("ADMIN");
  const p = await db.companyProfile.findUnique({ where: { id: profileId } });
  if (!p) return;
  await db.companyProfile.update({ where: { id: profileId }, data: { verified: !p.verified } });
  revalidatePath("/admin/users");
}

export async function createCategory(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
  await db.category.upsert({
    where: { slug },
    create: { name, slug, icon: String(formData.get("icon") ?? "🔧").trim() || "🔧" },
    update: {},
  });
  revalidatePath("/admin/categories");
}

export async function toggleCategory(id: string) {
  await requireRole("ADMIN");
  const c = await db.category.findUnique({ where: { id } });
  if (!c) return;
  await db.category.update({ where: { id }, data: { active: !c.active } });
  revalidatePath("/admin/categories");
}

export async function resolveReport(reportId: string, status: "RESOLVED" | "DISMISSED") {
  await requireRole("ADMIN");
  await db.report.update({ where: { id: reportId }, data: { status } });
  revalidatePath("/admin/reports");
}

/** Cualquier usuario puede denunciar a otro. */
export async function createReport(targetId: string, formData: FormData) {
  const user = await requireUser();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason || targetId === user.id) return;
  await db.report.create({ data: { reporterId: user.id, targetId, reason } });
}
