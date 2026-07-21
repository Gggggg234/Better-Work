import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE = "bw_session";

/**
 * Secreto de sesión. Se resuelve por pedido (no al importar) para que el build
 * no dependa de las variables de entorno. En producción es obligatorio; en
 * desarrollo cae a un valor local con aviso.
 */
let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.AUTH_SECRET;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Falta AUTH_SECRET: definí un secreto largo y aleatorio en las variables de entorno.");
    }
    console.warn("[auth] AUTH_SECRET no definido: usando un secreto de desarrollo. No usar en producción.");
  }
  cachedSecret = new TextEncoder().encode(raw ?? "dev-secret-inseguro-solo-local");
  return cachedSecret;
}

export type Session = { userId: string; role: string; name: string };

export async function createSession(payload: Session) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getSecret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/**
 * Lee y verifica la sesión. Envuelto en `cache()` de React: dentro de un mismo
 * request (layout + página + acciones) se resuelve una sola vez, sin repetir la
 * verificación del JWT ni la lectura de la cookie.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
});

/**
 * Devuelve el usuario actual (con perfiles) o null.
 *
 * También cacheado por request: el layout y la página suelen pedirlo los dos,
 * y sin esto serían dos `findUnique` idénticos a la base en cada carga.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { workerProfile: true, companyProfile: true },
  });
  if (!user || user.suspended) return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado");
  return user;
}

export async function requireRole(...roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error("No autorizado");
  return user;
}
