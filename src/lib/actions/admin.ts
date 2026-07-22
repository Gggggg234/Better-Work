"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
/**
 * Guarda un plan de empresa (Super Admin).
 *
 * Cada beneficio es una columna de `Plan`: para sumar uno nuevo basta con
 * agregar la columna, un campo en este form y su chequeo donde corresponda.
 */
export async function savePlan(formData: FormData) {
  await requireRole("ADMIN");
  const key = String(formData.get("key") ?? "");
  if (!key) return;

  const num = (n: string, min: number, max: number, fallback: number) => {
    const v = parseFloat(String(formData.get(n) ?? ""));
    return Number.isFinite(v) && v >= min && v <= max ? v : fallback;
  };
  const bool = (n: string) => formData.get(n) === "on";

  const current = await db.plan.findUnique({ where: { key } });
  if (!current) return;

  await db.plan.update({
    where: { key },
    data: {
      name: String(formData.get("name") ?? current.name).trim() || current.name,
      tagline: String(formData.get("tagline") ?? "").trim(),
      price: num("price", 0, 10_000_000, current.price),
      jobPostLimit: Math.round(num("jobPostLimit", -1, 999, current.jobPostLimit)),
      applicantLimit: Math.round(num("applicantLimit", -1, 9999, current.applicantLimit)),
      searchBoost: num("searchBoost", 0, 1, current.searchBoost),
      analytics: bool("analytics"),
      verifiedBadge: bool("verifiedBadge"),
      featuredHome: bool("featuredHome"),
      prioritySupport: bool("prioritySupport"),
      active: bool("active"),
    },
  });

  revalidatePath("/admin/plans");
  revalidatePath("/company/plan");
  revalidatePath("/app");
}

/**
 * Datos bancarios para las transferencias de membresías.
 *
 * El alias se muestra tal cual a las empresas en la pantalla de pago, así que
 * cambiarlo acá cambia el circuito completo sin tocar código.
 */
export async function saveTransferInfo(formData: FormData) {
  await requireRole("ADMIN");

  const alias = String(formData.get("transfer_alias") ?? "").trim();
  // El alias es obligatorio: sin él la empresa no sabe adónde transferir.
  if (!alias) return;

  await setSetting("transfer_alias", alias);
  await setSetting("transfer_holder", String(formData.get("transfer_holder") ?? "").trim());
  await setSetting("transfer_bank", String(formData.get("transfer_bank") ?? "").trim());

  revalidatePath("/admin/settings");
  revalidatePath("/company/plan");
}

/**
 * Porcentaje de seña sugerido al contratar.
 *
 * Sólo afecta a los trabajos nuevos: los ya creados conservan la seña que se
 * les calculó, para no cambiarle las condiciones a un acuerdo en curso.
 */
export async function saveDepositPct(formData: FormData) {
  await requireRole("ADMIN");

  const pct = parseFloat(String(formData.get("deposit_pct") ?? ""));
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return;

  await setSetting("deposit_pct", String(Math.round(pct)));
  revalidatePath("/admin/settings");
}

/**
 * Comisión que Better Work retiene de cada trabajo completado (escrow).
 * Se aplica al liberar el pago; se admite 0 a 100 %.
 */
export async function saveCommissionPct(formData: FormData) {
  await requireRole("ADMIN");

  const pct = parseFloat(String(formData.get("commission_pct") ?? ""));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;

  await setSetting("commission_pct", String(pct));
  revalidatePath("/admin/settings");
}

/** Guarda las reglas con las que se estiman los resultados de una campaña. */
export async function saveAdRules(formData: FormData) {
  await requireRole("ADMIN");
  const keys: Record<string, [number, number]> = {
    ad_impressions_per_1000: [1, 10_000],
    ad_view_rate: [0.1, 100],
    ad_min_budget: [0, 1_000_000],
  };
  for (const [k, [min, max]] of Object.entries(keys)) {
    const v = parseFloat(String(formData.get(k) ?? ""));
    if (!Number.isFinite(v) || v < min || v > max) continue;
    await db.setting.upsert({
      where: { key: k },
      create: { key: k, value: String(v) },
      update: { value: String(v) },
    });
  }
  revalidatePath("/admin/settings");
  revalidatePath("/ads/new");
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
