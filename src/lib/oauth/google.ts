/**
 * Inicio de sesión con Google (OAuth 2.0 + OpenID Connect).
 *
 * Implementado con `fetch` y la verificación de firma de `jose`, que ya estaba
 * en el proyecto: no hace falta ninguna dependencia nueva.
 *
 * Se activa sólo si están GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. Sin ellas,
 * `googleEnabled()` es false y la interfaz no muestra el botón, así que la app
 * sigue funcionando igual que antes.
 */

import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  jwks ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
  return jwks;
}

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

/** URL a la que mandamos al usuario para que elija su cuenta de Google. */
export function authUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    // `select_account` evita que entre siempre con la misma sesión de Google.
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
};

/**
 * Canjea el código por el id_token y valida su firma contra las claves
 * públicas de Google. No se confía en el contenido sin verificar.
 */
export async function exchangeCode(code: string, origin: string): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google rechazó el código de autorización (${res.status}).`);
  }

  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("Google no devolvió un id_token.");

  const { payload } = await jwtVerify(data.id_token, getJwks(), {
    issuer: ISSUERS,
    audience: process.env.GOOGLE_CLIENT_ID!,
  });

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (!email) throw new Error("La cuenta de Google no tiene un email asociado.");

  return {
    googleId: String(payload.sub),
    email,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0],
    picture: typeof payload.picture === "string" ? payload.picture : null,
    emailVerified: payload.email_verified === true,
  };
}
