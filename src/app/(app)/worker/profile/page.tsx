import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { updateWorkerProfile } from "@/lib/actions/profile";
import { logout } from "@/lib/actions/auth";
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
    payAlias: p.payAlias ?? "",
    payHolder: p.payHolder ?? "",
    priceHint: p.priceHint ?? "",
    gallery: parseArr(p.gallery),
    avatarUrl: me.avatarUrl ?? "",
    name: me.name,
    visible: p.visible,
  };

  // Perfil todavía sin completar: es el paso obligatorio del alta del trabajador.
  const incomplete = !p.profession || p.profession === "Sin definir";

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      {incomplete ? (
        // No hay "volver": el alta no se puede saltear. Sólo cerrar sesión.
        <form action={logout}>
          <button className="btn-ghost !px-2 -ml-2 !text-sm text-muted">Cerrar sesión</button>
        </form>
      ) : (
        <BackButton fallback="/profile" />
      )}
      <h1 className="text-2xl font-bold mt-2">Mi perfil profesional</h1>
      {incomplete ? (
        <div className="card p-4 mt-3 bg-fg text-bg">
          <p className="text-sm font-medium">Completá tu perfil para empezar</p>
          <p className="text-xs text-bg/70 mt-0.5">
            Necesitás cargar tu profesión para aparecer en Better Work y recibir trabajos. Es un solo paso.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted mt-1">
          Elegí de las opciones: cuanto más completo, mejor aparecés y más confianza generás.
        </p>
      )}
      <WorkerProfileForm initial={initial} categories={categories} action={updateWorkerProfile} />
    </main>
  );
}
