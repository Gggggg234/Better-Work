import { randomInt } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { escrowActive } from "@/lib/payments";
import { extendPro } from "@/lib/pro";

/**
 * Programa de referidos.
 *
 * El premio llega cuando el invitado COMPLETA su primer trabajo (código de
 * finalización) y sólo si ese trabajo no fue con quien lo invitó: así no
 * rinde crear cuentas falsas. Qué se gana depende de cómo se pagan los
 * trabajos:
 *
 *  - Pago directo (default): días de Manobra Pro. El profesional invitado
 *    arranca con 14; quien invita, si es profesional, gana 30 por invitado.
 *  - Pago protegido: trabajos bonificados (sin comisión para el profesional,
 *    sin tarifa de servicio para quien contrata). El invitado arranca con 1;
 *    quien invita gana 2.
 *
 * En ningún caso sale plata de Manobra por adelantado.
 */

export const REFERRAL_COOKIE = "bw_ref";
export const WELCOME_PRO_DAYS = 14;
export const REWARD_PRO_DAYS = 30;
export const WELCOME_FREE_JOBS = 1;
export const REWARD_FREE_JOBS = 2;
/** Tope de trabajos bonificados acumulados por persona. */
export const MAX_FREE_JOBS = 20;

/** Sin 0/O ni 1/I/L: el código se dicta y se escribe a mano. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newCode(): string {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** Código de invitación del usuario; se crea la primera vez que se pide. */
export async function referralCodeFor(userId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;
  // Con 31^6 combinaciones un choque es rarísimo, pero el índice único manda.
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const taken = await db.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (taken) continue;
    await db.user.update({ where: { id: userId }, data: { referralCode: code } });
    return code;
  }
  throw new Error("No se pudo generar un código de invitación.");
}

/** Quién invitó, según la cookie que dejó el link /r/CODIGO (o null). */
export async function inviterFromCookie(): Promise<{ id: string; name: string } | null> {
  const code = (await cookies()).get(REFERRAL_COOKIE)?.value;
  if (!code) return null;
  return db.user.findFirst({
    where: { referralCode: code.toUpperCase(), suspended: false },
    select: { id: true, name: true },
  });
}

/** Al crear una cuenta: la vincula con quien la invitó y le da la bienvenida. */
export async function applyReferralOnSignup(newUserId: string): Promise<void> {
  const inviter = await inviterFromCookie();
  if (!inviter || inviter.id === newUserId) return;
  const escrow = await escrowActive();
  await db.user.update({
    where: { id: newUserId },
    data: { referredById: inviter.id, ...(escrow ? { freeJobs: WELCOME_FREE_JOBS } : {}) },
  });
  if (!escrow) await welcomeInvitedWorker(newUserId);
  (await cookies()).delete(REFERRAL_COOKIE);
}

/**
 * Pago directo: un profesional invitado arranca con días de Pro. Se llama al
 * registrarse y al elegir el rol (las cuentas de Google lo eligen después);
 * sólo aplica si vino invitado y todavía no tuvo Pro.
 */
export async function welcomeInvitedWorker(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referredById: true, workerProfile: { select: { proUntil: true } } },
  });
  if (!user?.referredById || !user.workerProfile || user.workerProfile.proUntil) return;
  if (await escrowActive()) return;
  await extendPro(userId, WELCOME_PRO_DAYS, true);
}

/**
 * Tras completar un trabajo: si alguna de las partes vino invitada y es su
 * primer trabajo completado, se premia a quien la invitó (una sola vez).
 */
export async function rewardInvitersForJob(job: { clientId: string; workerId: string }): Promise<void> {
  const parties = [
    { userId: job.clientId, otherId: job.workerId },
    { userId: job.workerId, otherId: job.clientId },
  ];
  for (const { userId, otherId } of parties) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referredById: true, referralRewarded: true },
    });
    if (!user?.referredById || user.referralRewarded) continue;
    // Un trabajo con quien lo invitó no cuenta: evita premiarse a uno mismo.
    if (user.referredById === otherId) continue;

    // Marca primero (sólo si sigue sin marcar): nunca se premia dos veces.
    const marked = await db.user.updateMany({
      where: { id: userId, referralRewarded: false },
      data: { referralRewarded: true },
    });
    if (marked.count !== 1) continue;

    const inviter = await db.user.findUnique({
      where: { id: user.referredById },
      select: { freeJobs: true, workerProfile: { select: { id: true } } },
    });
    if (!inviter) continue;
    if (await escrowActive()) {
      await db.user.update({
        where: { id: user.referredById },
        data: { freeJobs: Math.min(MAX_FREE_JOBS, inviter.freeJobs + REWARD_FREE_JOBS) },
      });
    } else if (inviter.workerProfile) {
      // Pago directo: el premio son días de Pro (sólo tiene sentido para profesionales).
      await extendPro(user.referredById, REWARD_PRO_DAYS, true);
    }
  }
}

/** Usa un trabajo bonificado si hay. Atómico: dos pagos a la vez no usan el mismo. */
export async function takeFreeJob(userId: string): Promise<boolean> {
  const r = await db.user.updateMany({ where: { id: userId, freeJobs: { gt: 0 } }, data: { freeJobs: { decrement: 1 } } });
  return r.count === 1;
}

/** Devuelve un trabajo bonificado (p. ej. el trabajo se canceló y se reembolsó). */
export async function giveBackFreeJob(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { freeJobs: { increment: 1 } } });
}
