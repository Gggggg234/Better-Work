"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { createEmailToken, verifyUrl } from "@/lib/tokens";
import { sendVerificationEmail, mailConfigured, siteUrl } from "@/lib/mail";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  collectErrors,
  type FieldErrors,
} from "@/lib/validation";

/**
 * Estado que devuelven las acciones de autenticación.
 *
 * `fields` pinta el error debajo del input correspondiente; `error` es para
 * los fallos generales. `devLink` sólo aparece cuando no hay proveedor de
 * email configurado, para poder verificar la cuenta en desarrollo.
 */
export type ActionState =
  | {
      error?: string;
      ok?: string;
      fields?: FieldErrors;
      needsVerification?: boolean;
      email?: string;
      devLink?: string;
      /**
       * Lo que la persona había escrito. React 19 resetea el formulario cuando
       * la acción termina, así que sin esto un error de validación le borra
       * todo lo tipeado.
       */
      values?: { name?: string; email?: string };
    }
  | undefined;

/** Manda (o prepara) el email de verificación. Devuelve el enlace si no se envió. */
async function issueVerification(user: { id: string; email: string; name: string }): Promise<string | undefined> {
  const token = await createEmailToken(user.id);
  const url = verifyUrl(await siteUrl(), token);
  const result = await sendVerificationEmail(user.email, user.name, url);
  // Sin proveedor configurado devolvemos el enlace para no dejar la cuenta
  // inaccesible; con proveedor, el enlace nunca sale del servidor.
  return result.delivered ? undefined : url;
}

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Se conservan para devolverlos si la validación falla.
  const typed = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { fields: collectErrors(parsed.error), values: typed };

  const { name, email, password, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      fields: { email: "Ya existe una cuenta con ese email." },
      error: "¿Es tuya? Iniciá sesión o entrá con Google.",
      values: typed,
    };
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      // Hasta confirmar el email no se puede entrar.
      emailVerified: null,
    },
  });

  if (role === "WORKER") {
    await db.workerProfile.create({ data: { userId: user.id, profession: "Sin definir" } });
  }
  if (role === "COMPANY") {
    await db.companyProfile.create({ data: { userId: user.id, companyName: name } });
  }

  const devLink = await issueVerification(user);

  // No se crea sesión: primero confirma el email.
  return {
    ok: "Cuenta creada. Te mandamos un email para confirmar tu dirección.",
    needsVerification: true,
    email: user.email,
    devLink,
  };
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const typed = { email: String(formData.get("email") ?? "") };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fields: collectErrors(parsed.error), values: typed };

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Mismo mensaje para usuario inexistente y contraseña incorrecta: así no se
  // puede averiguar qué emails están registrados.
  const genericError = { error: "Email o contraseña incorrectos.", values: typed };
  if (!user) return genericError;

  if (!user.passwordHash) {
    return { error: "Esta cuenta se creó con Google. Entrá con el botón de Google.", values: typed };
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) return genericError;
  if (user.suspended) return { error: "Tu cuenta está suspendida. Escribinos a soporte.", values: typed };

  if (!user.emailVerified) {
    const devLink = await issueVerification(user);
    return {
      error: "Todavía no confirmaste tu email. Te reenviamos el enlace.",
      needsVerification: true,
      email: user.email,
      devLink,
    };
  }

  await createSession({ userId: user.id, role: user.role, name: user.name });
  if (!user.onboarded) redirect("/onboarding");
  redirect(user.role === "ADMIN" ? "/admin" : "/app");
}

/** Reenvía el email de verificación desde la pantalla de aviso. */
export async function resendVerification(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  // Respuesta idéntica exista o no la cuenta: no filtramos qué emails hay.
  if (!user || user.emailVerified) {
    return { ok: "Si la cuenta existe y falta confirmarla, te llegará un email." };
  }

  const devLink = await issueVerification(user);
  return {
    ok: mailConfigured()
      ? "Listo, te reenviamos el email de confirmación."
      : "Enlace generado (todavía no hay proveedor de email configurado).",
    needsVerification: true,
    email,
    devLink,
  };
}

export async function logout() {
  await destroySession();
  redirect("/");
}

/** Cambio de contraseña del usuario logueado (pide la actual). */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Iniciá sesión para cambiar tu contraseña." };

  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { fields: collectErrors(parsed.error) };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "No encontramos tu cuenta." };

  if (!user.passwordHash) {
    return { error: "Tu cuenta usa Google para entrar, así que no tiene contraseña." };
  }
  if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    return { fields: { current: "La contraseña actual no es correcta." } };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) },
  });
  return { ok: "Contraseña actualizada." };
}
