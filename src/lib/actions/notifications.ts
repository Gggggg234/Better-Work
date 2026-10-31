"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type SubscriptionJSON = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

/** Guarda la suscripción push de este dispositivo para la persona logueada. */
export async function savePushSubscription(sub: SubscriptionJSON): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  // Sólo endpoints https de un servicio de push (no URLs arbitrarias).
  if (!endpoint.startsWith("https://") || endpoint.length > 1000 || !p256dh || !auth) return { ok: false };

  // Un dispositivo es de quien lo usa ahora: si cambió de cuenta, se reasigna.
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth },
    update: { userId: user.id, p256dh, auth },
  });
  return { ok: true };
}

/** Desactiva las notificaciones push de este dispositivo. */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const user = await requireUser();
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
}
