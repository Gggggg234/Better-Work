import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncAllSubscriptions } from "@/lib/billing";

/**
 * Mantiene viva la base de Supabase.
 *
 * En el plan gratis, Supabase pausa el proyecto tras unos días sin actividad,
 * y con la base pausada nadie puede iniciar sesión. Vercel llama a esta ruta
 * una vez por día (ver vercel.json) y una consulta mínima alcanza para que
 * cuente como actividad.
 *
 * Si está CRON_SECRET, Vercel lo manda como "Bearer" y se exige; sin él la
 * ruta igual sólo hace un SELECT trivial.
 *
 * De paso sincroniza las suscripciones de Mercado Pago, para acreditar los
 * débitos mensuales aunque no haya llegado ningún webhook.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    await db.user.count();
    const synced = await syncAllSubscriptions().catch(() => -1);
    return NextResponse.json({ ok: true, synced, at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, error: "db" }, { status: 503 });
  }
}
