"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function createOffer(formData: FormData) {
  const user = await requireRole("COMPANY");
  const profile = await db.companyProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return;
  // Función premium: publicar requiere plan activo.
  if (!profile.planActiveUntil || profile.planActiveUntil < new Date()) redirect("/company/plan");

  await db.jobOffer.create({
    data: {
      companyId: profile.id,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      categoryId: String(formData.get("categoryId") ?? "") || null,
      city: String(formData.get("city") ?? "").trim(),
      modality: String(formData.get("modality") ?? "Presencial"),
      salary: String(formData.get("salary") ?? "").trim() || null,
    },
  });
  revalidatePath("/company");
  redirect("/company");
}

export async function toggleOffer(offerId: string) {
  const user = await requireRole("COMPANY");
  const offer = await db.jobOffer.findUnique({ where: { id: offerId }, include: { company: true } });
  if (!offer || offer.company.userId !== user.id) return;
  await db.jobOffer.update({ where: { id: offerId }, data: { active: !offer.active } });
  revalidatePath("/company");
}

export async function applyToOffer(offerId: string, formData: FormData) {
  const user = await requireRole("WORKER");
  await db.application.upsert({
    where: { offerId_workerId: { offerId, workerId: user.id } },
    create: { offerId, workerId: user.id, message: String(formData.get("message") ?? "").trim() },
    update: {},
  });
  revalidatePath(`/offers/${offerId}`);
}

export async function setApplicationStatus(applicationId: string, status: "ACCEPTED" | "REJECTED") {
  const user = await requireRole("COMPANY");
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { offer: { include: { company: true } } },
  });
  if (!app || app.offer.company.userId !== user.id) return;
  await db.application.update({ where: { id: applicationId }, data: { status } });
  revalidatePath("/company");
}
