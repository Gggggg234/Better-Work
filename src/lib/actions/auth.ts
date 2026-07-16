"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, getSession } from "@/lib/auth";

export type ActionState = { error?: string; ok?: string } | undefined;

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "CLIENT");

  if (!name || !email || password.length < 6) {
    return { error: "Completá nombre, email y una contraseña de al menos 6 caracteres." };
  }
  if (!["CLIENT", "WORKER", "COMPANY"].includes(role)) {
    return { error: "Rol inválido." };
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Ya existe una cuenta con ese email." };

  const user = await db.user.create({
    data: { name, email, role, passwordHash: await bcrypt.hash(password, 10) },
  });

  if (role === "WORKER") {
    await db.workerProfile.create({
      data: { userId: user.id, profession: String(formData.get("profession") ?? "").trim() || "Sin definir" },
    });
  }
  if (role === "COMPANY") {
    await db.companyProfile.create({
      data: { userId: user.id, companyName: name },
    });
  }

  await createSession({ userId: user.id, role: user.role, name: user.name });
  redirect(role === "WORKER" ? "/worker/profile" : role === "COMPANY" ? "/company" : "/app");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Email o contraseña incorrectos." };
  }
  if (user.suspended) return { error: "Tu cuenta está suspendida. Contactá a soporte." };

  await createSession({ userId: user.id, role: user.role, name: user.name });
  redirect(user.role === "ADMIN" ? "/admin" : "/app");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

/** Cambio de contraseña del usuario logueado (pide la actual). */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Iniciá sesión para cambiar tu contraseña." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  if (next === current) return { error: "La nueva contraseña debe ser distinta de la actual." };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "La contraseña actual no es correcta." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  return { ok: "Contraseña actualizada." };
}
