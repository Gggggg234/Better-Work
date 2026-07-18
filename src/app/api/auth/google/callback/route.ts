import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { googleEnabled, exchangeCode } from "@/lib/oauth/google";

/**
 * Vuelta de Google.
 *
 * Casos que resuelve:
 *  - Cuenta con ese googleId → entra.
 *  - Email ya registrado con contraseña → vincula el googleId y entra (no
 *    duplica cuentas), sólo si Google confirma que el email es verificado.
 *  - Email nuevo → crea la cuenta SIN rol definitivo y la manda al asistente
 *    de perfil. Google no saltea el onboarding.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, origin));

  if (!googleEnabled()) return fail("google_off");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return fail("google_cancel");
  if (!code || !state) return fail("google");

  // El state debe coincidir con el que guardamos al iniciar el flujo.
  const jar = await cookies();
  const expected = jar.get("bw_oauth_state")?.value;
  jar.delete("bw_oauth_state");
  if (!expected || expected !== state) return fail("google_state");

  let profile;
  try {
    profile = await exchangeCode(code, origin);
  } catch {
    return fail("google");
  }

  // Google debe confirmar que el email es suyo, si no cualquiera podría
  // reclamar la cuenta de otro.
  if (!profile.emailVerified) return fail("google_unverified");

  const existing = await db.user.findFirst({
    where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
  });

  if (existing) {
    if (existing.suspended) return fail("suspended");

    await db.user.update({
      where: { id: existing.id },
      data: {
        googleId: existing.googleId ?? profile.googleId,
        // Entrar con Google confirma el email de una cuenta creada a mano.
        emailVerified: existing.emailVerified ?? new Date(),
        avatarUrl: existing.avatarUrl ?? profile.picture,
      },
    });

    await createSession({ userId: existing.id, role: existing.role, name: existing.name });
    if (!existing.onboarded) return NextResponse.redirect(new URL("/onboarding", origin));
    return NextResponse.redirect(new URL(existing.role === "ADMIN" ? "/admin" : "/app", origin));
  }

  // Cuenta nueva: entra como CLIENT provisorio y define su rol en el asistente.
  const user = await db.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
      avatarUrl: profile.picture,
      role: "CLIENT",
      emailVerified: new Date(),
      onboarded: false,
    },
  });

  await createSession({ userId: user.id, role: user.role, name: user.name });
  return NextResponse.redirect(new URL("/onboarding", origin));
}
