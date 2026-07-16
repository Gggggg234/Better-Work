"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { trySaveImage, deleteUpload } from "@/lib/upload";

/** Cambia la foto de perfil de cualquier usuario (archivo, no URL). */
export async function updateAvatar(formData: FormData): Promise<void> {
  const user = await requireUser();
  const file = formData.get("avatarFile");
  if (!(file instanceof File) || file.size === 0) return;

  const url = await trySaveImage(file);
  if (!url) return;

  if (user.avatarUrl?.startsWith("/uploads/")) await deleteUpload(user.avatarUrl);
  await db.user.update({ where: { id: user.id }, data: { avatarUrl: url } });

  revalidatePath("/profile");
  revalidatePath("/app");
}

export async function updateWorkerProfile(formData: FormData) {
  const user = await requireRole("WORKER");

  const splitList = (key: string, sep: string | RegExp = ",") =>
    String(formData.get(key) ?? "")
      .split(sep)
      .map((s) => s.trim())
      .filter(Boolean);

  const parseJsonArr = (key: string): string[] => {
    try {
      const parsed = JSON.parse(String(formData.get(key) ?? "[]"));
      return Array.isArray(parsed) ? parsed.filter((d) => typeof d === "string") : [];
    } catch {
      return [];
    }
  };

  const services = splitList("services");
  const payMethods = splitList("payMethods");
  const availableDays = parseJsonArr("availableDays");

  const workModeRaw = String(formData.get("workMode") ?? "AMBOS");
  const workMode = ["ONSITE", "REMOTE", "AMBOS"].includes(workModeRaw) ? workModeRaw : "AMBOS";

  const lat = parseFloat(String(formData.get("lat") ?? ""));
  const lng = parseFloat(String(formData.get("lng") ?? ""));

  // Galería: URLs existentes que el usuario decidió conservar + fotos nuevas subidas.
  const previous: string[] = (() => {
    try {
      return JSON.parse(user.workerProfile?.gallery || "[]");
    } catch {
      return [];
    }
  })();
  const kept = parseJsonArr("galleryKeep").filter((u) => previous.includes(u));
  const gallery = [...kept];
  for (const entry of formData.getAll("galleryFiles")) {
    if (entry instanceof File && entry.size > 0 && gallery.length < 12) {
      const url = await trySaveImage(entry);
      if (url) gallery.push(url);
    }
  }
  // Limpiar del disco las fotos propias que se quitaron.
  for (const old of previous) {
    if (!gallery.includes(old)) await deleteUpload(old);
  }

  await db.workerProfile.update({
    where: { userId: user.id },
    data: {
      profession: String(formData.get("profession") ?? "").trim(),
      bio: String(formData.get("bio") ?? "").trim(),
      experience: parseInt(String(formData.get("experience") ?? "0")) || 0,
      categoryId: String(formData.get("categoryId") ?? "") || null,
      services: JSON.stringify(services),
      gallery: JSON.stringify(gallery),
      city: String(formData.get("city") ?? "").trim(),
      zone: String(formData.get("zone") ?? "").trim(),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      radiusKm: parseFloat(String(formData.get("radiusKm") ?? "10")) || 10,
      schedule: String(formData.get("schedule") ?? "").trim(),
      availableDays: JSON.stringify(availableDays),
      workMode,
      whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
      payMethods: JSON.stringify(payMethods),
      priceHint: String(formData.get("priceHint") ?? "").trim() || null,
      visible: formData.get("visible") === "on",
    },
  });

  // Foto de perfil subida desde el mismo formulario.
  const avatarFile = formData.get("avatarFile");
  const userData: { phone: string | null; avatarUrl?: string } = {
    phone: String(formData.get("phone") ?? "").trim() || null,
  };
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const url = await trySaveImage(avatarFile);
    if (url) {
      if (user.avatarUrl?.startsWith("/uploads/")) await deleteUpload(user.avatarUrl);
      userData.avatarUrl = url;
    }
  }
  await db.user.update({ where: { id: user.id }, data: userData });

  revalidatePath("/worker/profile");
  revalidatePath("/app");
}

export async function updateCompanyProfile(formData: FormData) {
  const user = await requireRole("COMPANY");
  const lat = parseFloat(String(formData.get("lat") ?? ""));
  const lng = parseFloat(String(formData.get("lng") ?? ""));

  await db.companyProfile.update({
    where: { userId: user.id },
    data: {
      companyName: String(formData.get("companyName") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      industry: String(formData.get("industry") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim() || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    },
  });

  revalidatePath("/company");
}
