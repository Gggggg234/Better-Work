import crypto from "node:crypto";
import { db } from "./db";

/**
 * Tokens de un solo uso para verificar el email.
 *
 * Se generan con `randomBytes` (no con Math.random) y vencen a las 24 h. Al
 * consumirse se borran, así un enlace filtrado no sirve dos veces.
 */

const TTL_HOURS = 24;

export function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Crea un token de verificación y descarta los anteriores del mismo usuario. */
export async function createEmailToken(userId: string): Promise<string> {
  const token = newToken();
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, kind: "EMAIL_VERIFY" } }),
    db.authToken.create({
      data: {
        token,
        userId,
        kind: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + TTL_HOURS * 3_600_000),
      },
    }),
  ]);
  return token;
}

export type TokenCheck =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" };

/** Consume un token: si es válido lo borra y devuelve el usuario. */
export async function consumeEmailToken(token: string): Promise<TokenCheck> {
  const row = await db.authToken.findUnique({ where: { token } });
  if (!row || row.kind !== "EMAIL_VERIFY") return { ok: false, reason: "invalid" };

  if (row.expiresAt < new Date()) {
    await db.authToken.delete({ where: { token } }).catch(() => {});
    return { ok: false, reason: "expired" };
  }

  await db.authToken.delete({ where: { token } });
  return { ok: true, userId: row.userId };
}

export function verifyUrl(base: string, token: string): string {
  return `${base}/verify?token=${token}`;
}
