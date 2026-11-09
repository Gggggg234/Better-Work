import webpush from "web-push";
import { db } from "@/lib/db";
import { siteOrigin } from "@/lib/site";

/**
 * Notificaciones: se guardan en el centro de notificaciones de la app y, si
 * la persona activó las notificaciones push en su dispositivo, le llegan al
 * celular aunque no tenga la app abierta.
 *
 * Push usa Web Push estándar (sin servicios de terceros). Las claves VAPID se
 * toman de VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY si están; si no, se generan
 * una vez y se guardan en Setting, así funciona sin configurar nada.
 */

export type NotifyInput = { title: string; body?: string; url?: string };

type VapidKeys = { publicKey: string; privateKey: string };
let vapidCache: Promise<VapidKeys> | null = null;

async function loadVapidKeys(): Promise<VapidKeys> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const rows = await db.setting.findMany({ where: { key: { in: ["vapid_public", "vapid_private"] } } });
  const pub = rows.find((r) => r.key === "vapid_public")?.value;
  const priv = rows.find((r) => r.key === "vapid_private")?.value;
  if (pub && priv) return { publicKey: pub, privateKey: priv };

  // Primera vez: se generan y se guardan. Si dos pedidos llegan a la vez, el
  // índice único de Setting deja ganar a uno y el otro relee.
  const keys = webpush.generateVAPIDKeys();
  try {
    await db.$transaction([
      db.setting.create({ data: { key: "vapid_public", value: keys.publicKey } }),
      db.setting.create({ data: { key: "vapid_private", value: keys.privateKey } }),
    ]);
    return keys;
  } catch {
    vapidCache = null;
    return loadVapidKeys();
  }
}

function vapidKeys(): Promise<VapidKeys> {
  vapidCache ??= loadVapidKeys().catch((e) => {
    vapidCache = null;
    throw e;
  });
  return vapidCache;
}

/** Clave pública para que el navegador se suscriba. */
export async function vapidPublicKey(): Promise<string> {
  return (await vapidKeys()).publicKey;
}

/** Contacto que exige Web Push: el sitio (https) o, en desarrollo, un mailto genérico. */
function vapidSubject(): string {
  const origin = siteOrigin();
  return origin.startsWith("https:") ? origin : "mailto:dev@example.com";
}

/**
 * Avisa a una o varias personas. Pensado para llamarse dentro de `after()`:
 * nunca tira error (un aviso fallido no debe romper la acción que lo dispara).
 */
export async function notify(userIds: string | string[], input: NotifyInput): Promise<void> {
  const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])].filter(Boolean);
  if (ids.length === 0) return;
  const title = input.title.slice(0, 120);
  const body = (input.body ?? "").slice(0, 300);
  const url = input.url ?? "/";

  try {
    await db.notification.createMany({ data: ids.map((userId) => ({ userId, title, body, url })) });
  } catch (e) {
    console.error("[notify] no se pudo guardar:", e);
  }

  try {
    const subs = await db.pushSubscription.findMany({ where: { userId: { in: ids } } });
    if (subs.length === 0) return;
    const keys = await vapidKeys();
    const payload = JSON.stringify({ title, body, url });
    const gone: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            TTL: 60 * 60 * 24,
            vapidDetails: { subject: vapidSubject(), publicKey: keys.publicKey, privateKey: keys.privateKey },
          });
        } catch (err) {
          // 404/410: el dispositivo dio de baja la suscripción; se limpia.
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(s.id);
          else console.error("[notify] push falló:", status ?? err);
        }
      })
    );
    if (gone.length) await db.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  } catch (e) {
    console.error("[notify] push:", e);
  }
}

const MESSAGE_PREVIEW: Record<string, string> = {
  IMAGE: "Te mandó una foto",
  FILE: "Te mandó un archivo",
  LOCATION: "Te mandó una ubicación",
  BUDGET: "Te mandó un presupuesto",
};

/**
 * Mensaje nuevo en el chat. Avisa sólo con el primer mensaje sin leer del
 * remitente en esa conversación: así una charla no se convierte en una
 * notificación por mensaje.
 */
export async function notifyChatMessage(msg: {
  conversationId: string;
  senderId: string;
  senderName: string;
  type: string;
  content: string;
}): Promise<void> {
  try {
    const conv = await db.conversation.findUnique({
      where: { id: msg.conversationId },
      select: { aId: true, bId: true },
    });
    if (!conv) return;
    const recipient = conv.aId === msg.senderId ? conv.bId : conv.aId;
    const unread = await db.message.count({
      where: { conversationId: msg.conversationId, senderId: msg.senderId, readAt: null },
    });
    if (unread !== 1) return;
    await notify(recipient, {
      title: `${msg.senderName.trim().split(/\s+/)[0]}`,
      body: MESSAGE_PREVIEW[msg.type] ?? msg.content.slice(0, 140),
      url: `/chat/${msg.conversationId}`,
    });
  } catch (e) {
    console.error("[notify] chat:", e);
  }
}
