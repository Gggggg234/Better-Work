"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createSession } from "@/lib/auth";

/**
 * Elección de rol para las cuentas creadas con Google.
 *
 * Google entrega email y nombre, pero no sabe si la persona viene a contratar,
 * a ofrecer servicios o como empresa. Acá define eso y sigue al mismo
 * asistente de perfil que usa el registro normal: entrar con Google no saltea
 * ningún paso.
 */
export async function chooseRole(formData: FormData): Promise<void> {
  const user = await requireUser();
  const role = String(formData.get("role") ?? "");

  if (!["CLIENT", "WORKER", "COMPANY"].includes(role)) {
    redirect("/onboarding?error=rol");
  }
  // Sólo aplica a cuentas que todavía no terminaron el alta.
  if (user.onboarded) redirect("/app");

  await db.user.update({
    where: { id: user.id },
    data: { role, onboarded: true },
  });

  if (role === "WORKER" && !user.workerProfile) {
    await db.workerProfile.create({ data: { userId: user.id, profession: "Sin definir" } });
  }
  if (role === "COMPANY" && !user.companyProfile) {
    await db.companyProfile.create({ data: { userId: user.id, companyName: user.name } });
  }

  // La sesión lleva el rol: hay que reemitirla o seguiría siendo CLIENT.
  await createSession({ userId: user.id, role, name: user.name });

  revalidatePath("/", "layout");
  // Cada rol continúa donde debe completar sus datos.
  redirect(role === "WORKER" ? "/worker/profile" : role === "COMPANY" ? "/company" : "/app");
}
