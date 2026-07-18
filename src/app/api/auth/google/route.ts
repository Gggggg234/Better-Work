import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { googleEnabled, authUrl } from "@/lib/oauth/google";

/**
 * Arranca el login con Google.
 *
 * Genera un `state` aleatorio y lo guarda en una cookie httpOnly para
 * comprobarlo a la vuelta: sin eso, un tercero podría forzar el callback
 * (CSRF sobre el flujo de OAuth).
 */
export async function GET(request: Request) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL("/login?error=google_off", request.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("bw_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutos
    secure: process.env.NODE_ENV === "production",
  });

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(authUrl(origin, state));
}
