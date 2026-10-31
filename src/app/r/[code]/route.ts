import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { REFERRAL_COOKIE } from "@/lib/referrals";

/**
 * Link de invitación: /r/CODIGO (opcional ?rol=trabajador).
 *
 * Guarda el código en una cookie por 30 días y lleva al registro. La cookie
 * se lee al crear la cuenta (con email o con Google), así la invitación no se
 * pierde aunque la persona se registre más tarde.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(request.url);
  const target = new URL("/register", url.origin);
  const rol = url.searchParams.get("rol");
  if (rol) target.searchParams.set("rol", rol);

  const res = NextResponse.redirect(target);
  const normalized = code.toUpperCase().slice(0, 12);
  const inviter = await db.user.findFirst({
    where: { referralCode: normalized, suspended: false },
    select: { id: true },
  });
  if (inviter) {
    res.cookies.set(REFERRAL_COOKIE, normalized, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }
  return res;
}
