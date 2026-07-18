import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { updateWorkerProfile } from "@/lib/actions/profile";
import { WorkerProfileForm, type WorkerFormInitial } from "@/components/worker/WorkerProfileForm";
import { BackButton } from "@/components/BackButton";

function parseArr(json: string): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function WorkerProfileEditPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "WORKER" || !me.workerProfile) redirect("/app");
  const p = me.workerProfile;

  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true, icon: true },
  });

  const initial: WorkerFormInitial = {
    profession: p.profession === "Sin definir" ? "" : p.profession,
    categoryId: p.categoryId,
    services: parseArr(p.services),
    experience: p.experience,
    bio: p.bio,
    city: p.city,
    zone: p.zone,
    lat: p.lat,
    lng: p.lng,
    radiusKm: p.radiusKm,
    schedule: p.schedule,
    availableDays: parseArr(p.availableDays),
    workMode: p.workMode,
    whatsapp: p.whatsapp ?? "",
    phone: me.phone ?? "",
    payMethods: parseArr(p.payMethods),
    priceHint: p.priceHint ?? "",
    gallery: parseArr(p.gallery),
    avatarUrl: me.avatarUrl ?? "",
    name: me.name,
    visible: p.visible,
  };

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <BackButton fallback="/profile" />
      <h1 className="text-2xl font-bold">Mi perfil profesional</h1>
      <p className="text-sm text-muted mt-1">
        Elegí de las opciones: cuanto más completo, mejor aparecés y más confianza generás.
      </p>
      <WorkerProfileForm initial={initial} categories={categories} action={updateWorkerProfile} />
    </main>
  );
}
