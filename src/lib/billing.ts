import { db } from "@/lib/db";
import { siteUrl, sendProApprovedEmail, sendPlanApprovedEmail } from "@/lib/mail";
import { extendPro } from "@/lib/pro";
import { notify } from "@/lib/notify";
import { getSetting, setSetting } from "@/lib/settings";
import * as mp from "@/lib/payments/mercadopago";

/**
 * Cobros de la plataforma con Mercado Pago: Manobra Pro, membresías de
 * empresa y carga de la billetera de publicidad.
 *
 * Dos formas de pagar:
 *  - Suscripción (débito automático mensual, "preapproval"): Mercado Pago
 *    cobra solo cada mes y cada cobro acreditado suma 30 días.
 *  - Pago único (Checkout Pro): un mes, o una carga de saldo. Acepta tarjeta,
 *    dinero en cuenta y efectivo.
 *
 * Nunca confiamos en lo que llega del navegador ni del webhook: siempre se
 * re-consulta a Mercado Pago. Y cada cobro se aplica una sola vez (pasa de
 * PENDING a APPROVED con un `updateMany` condicionado), así que un aviso
 * repetido no regala días.
 *
 * Como para suscripciones Mercado Pago no permite fijar la URL de
 * notificaciones por pedido, no dependemos sólo del webhook: también se
 * sincroniza al volver del checkout, al abrir las pantallas de pago y una vez
 * por día con el cron.
 */

export type BillingKind = "PRO" | "PLAN" | "WALLET";
export type BillingMode = "mercadopago" | "simulated" | "off";

const DAY = 86_400_000;

/** Con credenciales, Mercado Pago real. Sin ellas: simulado en desarrollo, apagado en producción. */
export function billingMode(): BillingMode {
  if (process.env.MP_ACCESS_TOKEN?.trim()) return "mercadopago";
  return process.env.NODE_ENV !== "production" ? "simulated" : "off";
}

export type BillingMethods = "both" | "mp" | "transfer";

/** Lo que eligió el Super Admin para cobrar Pro, planes y saldo. Sin Mercado Pago, sólo transferencia. */
export async function getBillingMethods(): Promise<BillingMethods> {
  if (billingMode() === "off") return "transfer";
  const v = await getSetting("billing_methods", "both");
  return v === "mp" || v === "transfer" ? v : "both";
}

export type MpCheck = {
  at: string;
  ok: boolean;
  where: string;
  account?: string;
  site?: string;
  status?: number;
  code?: string;
  detail?: string;
};

/** Saca de un mensaje cualquier cosa que pueda ser una credencial. */
function sinCredenciales(s: string): string {
  return s.replace(/Bearer\s+\S+/gi, "Bearer ***").replace(/\b(APP_USR|TEST)-[\w-]+/g, "$1-***").slice(0, 300);
}

function describirError(where: string, e: unknown): MpCheck {
  const base = { at: new Date().toISOString(), ok: false, where };
  if (e instanceof mp.MpApiError) return { ...base, status: e.status, code: e.code, detail: sinCredenciales(e.detail) };
  return { ...base, detail: sinCredenciales(e instanceof Error ? e.message : String(e)) };
}

/** Guarda el último rechazo para mostrarlo en Admin → Pagos: es adonde se mira cuando algo falla. */
async function recordMpError(where: string, e: unknown): Promise<void> {
  await setSetting("mp_last_error", JSON.stringify(describirError(where, e))).catch(() => {});
}

/** Traduce el rechazo a qué hay que hacer. */
export function explainMpError(c: Pick<MpCheck, "status" | "code" | "detail">): string {
  const code = (c.code ?? "").toLowerCase();
  if (code.includes("collector_does_not_comply"))
    return "La cuenta de Mercado Pago tiene una validación de identidad pendiente. La tiene que completar el titular de la cuenta.";
  if (code.includes("invalid_access_token") || c.status === 401)
    return "Mercado Pago no acepta el MP_ACCESS_TOKEN. Copiá de nuevo el Access Token de producción, cargalo en Vercel y volvé a desplegar.";
  if (code.includes("invalid_back_urls"))
    return "La dirección del sitio no es válida. Revisá NEXT_PUBLIC_SITE_URL en Vercel: tiene que empezar con https://.";
  if (c.status === 403)
    return "Mercado Pago no autorizó la operación: el token no es válido o la aplicación no tiene activadas las credenciales de producción. Revisá el Access Token en Tus integraciones, cargalo en Vercel y volvé a desplegar.";
  return "Mercado Pago rechazó la operación. El detalle de abajo dice el motivo.";
}

/** Prueba real contra Mercado Pago, a pedido del Super Admin. No cobra nada. */
export async function runMpCheck(): Promise<void> {
  let r: MpCheck;
  if (billingMode() !== "mercadopago") {
    r = { at: new Date().toISOString(), ok: false, where: "Prueba", detail: "El servidor no tiene MP_ACCESS_TOKEN." };
  } else {
    try {
      const { account, site } = await mp.probeMercadoPago(await siteUrl());
      r = { at: new Date().toISOString(), ok: true, where: "Prueba", account, site };
    } catch (e) {
      r = describirError("Prueba", e);
    }
  }
  await setSetting("mp_last_check", JSON.stringify(r));
}

export async function getMpDiagnostics(): Promise<{ check: MpCheck | null; lastError: MpCheck | null }> {
  const parse = (s: string): MpCheck | null => {
    try {
      return s ? (JSON.parse(s) as MpCheck) : null;
    } catch {
      return null;
    }
  };
  const [check, lastError] = await Promise.all([getSetting("mp_last_check"), getSetting("mp_last_error")]);
  return { check: parse(check), lastError: parse(lastError) };
}

export const SUB_STATUS_LABEL: Record<string, string> = {
  PENDING: "Esperando la autorización en Mercado Pago",
  AUTHORIZED: "Activa: se renueva sola cada mes",
  PAUSED: "Pausada",
  CANCELLED: "Cancelada",
};

function mapStatus(s: string): string {
  switch (s) {
    case "authorized":
      return "AUTHORIZED";
    case "paused":
      return "PAUSED";
    case "cancelled":
    case "canceled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

// ─────────────────────────── Efectos de un cobro ───────────────────────────

/** Renovar el mismo plan suma días; cambiar de plan reinicia el período. */
function nextExpiry(current: Date | null, samePlan: boolean, days: number): Date {
  const base = samePlan && current && current > new Date() ? current : new Date();
  return new Date(base.getTime() + days * DAY);
}

/**
 * Marca el cobro como aprobado y, sólo si este llamado fue el que lo aprobó,
 * aplica lo comprado. Devuelve si se aplicó.
 */
async function approveAndApply(paymentId: string, mpPaymentId?: string): Promise<boolean> {
  const marked = await db.mpPayment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "APPROVED", approvedAt: new Date(), ...(mpPaymentId ? { mpPaymentId } : {}) },
  });
  if (marked.count !== 1) return false;

  const p = await db.mpPayment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!p) return false;

  if (p.kind === "PRO") {
    const until = await extendPro(p.userId, p.days);
    await db.promotion.create({ data: { userId: p.userId, kind: "WORKER_PRO", refId: "pro", days: p.days, amount: p.amount } });
    if (until) await sendProApprovedEmail(p.user.email, until).catch(() => {});
    await notify(p.userId, {
      title: "¡Ya sos Pro!",
      body: "Recibimos tu pago. Ya aparecés más arriba y mandás presupuestos sin límite.",
      url: "/pro",
    }).catch(() => {});
  } else if (p.kind === "PLAN" && p.refKey) {
    const [plan, company] = await Promise.all([
      db.plan.findUnique({ where: { key: p.refKey } }),
      db.companyProfile.findUnique({ where: { userId: p.userId } }),
    ]);
    if (plan && company) {
      const until = nextExpiry(company.planActiveUntil, company.planKey === plan.key, p.days);
      await db.companyProfile.update({
        where: { id: company.id },
        data: { planKey: plan.key, planActiveUntil: until, verified: plan.verifiedBadge ? true : company.verified },
      });
      await db.promotion.create({
        data: { userId: p.userId, kind: "COMPANY_PLAN", refId: plan.key, days: p.days, amount: p.amount },
      });
      await sendPlanApprovedEmail(p.user.email, plan.name, until).catch(() => {});
      await notify(p.userId, { title: `Plan ${plan.name} activo`, body: "Recibimos tu pago de Mercado Pago.", url: "/company/plan" }).catch(
        () => {}
      );
    }
  } else if (p.kind === "WALLET") {
    const wallet = await db.adWallet.upsert({
      where: { userId: p.userId },
      create: { userId: p.userId, balance: p.amount },
      update: { balance: { increment: p.amount } },
    });
    // Queda en el historial de cargas, ya acreditada.
    await db.walletTopUp.create({
      data: { walletId: wallet.id, amount: p.amount, receiptUrl: "", status: "APPROVED", note: "Mercado Pago", reviewedAt: new Date() },
    });
    await notify(p.userId, { title: "Saldo acreditado", body: "Ya podés lanzar tu campaña.", url: "/ads/wallet" }).catch(() => {});
  }
  return true;
}

// ─────────────────────────────── Suscripciones ───────────────────────────────

/**
 * Trae el estado de la suscripción desde Mercado Pago y aplica los cobros
 * nuevos. Seguro de llamar muchas veces y en paralelo.
 */
export async function syncSubscription(subscriptionId: string): Promise<void> {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || !sub.mpPreapprovalId || billingMode() !== "mercadopago") return;

  const pre = await mp.getPreapproval(sub.mpPreapprovalId);
  const status = mapStatus(pre.status);
  const charged = Math.max(0, pre.summarized?.charged_quantity ?? 0);

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status,
      nextPaymentAt: pre.next_payment_date ? new Date(pre.next_payment_date) : null,
      syncedAt: new Date(),
    },
  });

  // Recién autorizada: si había otra del mismo tipo (ej. cambio de plan), se cancela para no cobrar doble.
  if (status === "AUTHORIZED" && sub.status !== "AUTHORIZED") await cancelOthers(sub.userId, sub.kind, sub.id);

  if (charged > sub.chargedCount) {
    // Candado optimista: sólo el que mueve el contador aplica los días.
    const claimed = await db.subscription.updateMany({
      where: { id: sub.id, chargedCount: sub.chargedCount },
      data: {
        chargedCount: charged,
        lastChargeAt: pre.summarized?.last_charged_date ? new Date(pre.summarized.last_charged_date) : new Date(),
      },
    });
    if (claimed.count === 1) {
      for (let i = sub.chargedCount; i < charged; i++) {
        const p = await db.mpPayment.create({
          data: {
            userId: sub.userId,
            kind: sub.kind,
            refKey: sub.planKey,
            amount: sub.amount,
            days: 30,
            source: "SUBSCRIPTION",
            subscriptionId: sub.id,
          },
        });
        await approveAndApply(p.id);
      }
    }
  }
}

async function cancelOthers(userId: string, kind: string, keepId: string) {
  const others = await db.subscription.findMany({
    where: { userId, kind, id: { not: keepId }, status: { in: ["PENDING", "AUTHORIZED", "PAUSED"] } },
  });
  for (const o of others) {
    if (o.mpPreapprovalId && billingMode() === "mercadopago") await mp.cancelPreapproval(o.mpPreapprovalId).catch(() => {});
    await db.subscription.update({ where: { id: o.id }, data: { status: "CANCELLED" } });
  }
}

/**
 * Inicia una suscripción mensual. Devuelve adónde mandar a la persona: el
 * checkout de Mercado Pago (o, simulado en desarrollo, de vuelta a la app).
 */
export async function startSubscription(input: {
  userId: string;
  kind: "PRO" | "PLAN";
  planKey?: string;
  amount: number;
  payerEmail: string;
  reason: string;
  returnPath: string;
}): Promise<string> {
  const mode = billingMode();
  if (mode === "off") throw new Error("Mercado Pago no está configurado.");

  const sub = await db.subscription.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      planKey: input.planKey ?? null,
      amount: input.amount,
      payerEmail: input.payerEmail,
    },
  });
  const back = `${input.returnPath}?mp=sub&sid=${sub.id}`;

  if (mode === "simulated") {
    // Desarrollo sin credenciales: se autoriza y se cobra el primer mes al instante.
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: "AUTHORIZED", chargedCount: 1, lastChargeAt: new Date(), nextPaymentAt: new Date(Date.now() + 30 * DAY) },
    });
    await cancelOthers(input.userId, input.kind, sub.id);
    const p = await db.mpPayment.create({
      data: { userId: input.userId, kind: input.kind, refKey: input.planKey ?? null, amount: input.amount, source: "SUBSCRIPTION", subscriptionId: sub.id },
    });
    await approveAndApply(p.id);
    return back;
  }

  const base = await siteUrl();
  try {
    const pre = await mp.createPreapproval({
      reason: input.reason,
      externalReference: `sub:${sub.id}`,
      payerEmail: input.payerEmail,
      amount: input.amount,
      backUrl: `${base}${back}`,
    });
    await db.subscription.update({ where: { id: sub.id }, data: { mpPreapprovalId: pre.id } });
    if (!pre.init_point) throw new Error("Mercado Pago no devolvió el link de la suscripción.");
    return pre.init_point;
  } catch (e) {
    // Si Mercado Pago la rechazó, no queda una suscripción colgada.
    await db.subscription.delete({ where: { id: sub.id } }).catch(() => {});
    await recordMpError("Suscripción", e);
    throw e;
  }
}

/** Cancela los débitos futuros. Lo ya pagado sigue vigente hasta su vencimiento. */
export async function cancelSubscriptionFor(userId: string, subscriptionId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || sub.userId !== userId || sub.status === "CANCELLED") return false;
  if (sub.mpPreapprovalId && billingMode() === "mercadopago") await mp.cancelPreapproval(sub.mpPreapprovalId);
  await db.subscription.update({ where: { id: sub.id }, data: { status: "CANCELLED" } });
  return true;
}

// ─────────────────────────────── Pagos únicos ───────────────────────────────

export async function startCheckout(input: {
  userId: string;
  payerEmail?: string;
  kind: BillingKind;
  refKey?: string;
  amount: number;
  days?: number;
  title: string;
  returnPath: string;
}): Promise<string> {
  const mode = billingMode();
  if (mode === "off") throw new Error("Mercado Pago no está configurado.");

  const p = await db.mpPayment.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      refKey: input.refKey ?? null,
      amount: input.amount,
      days: input.days ?? 30,
    },
  });

  if (mode === "simulated") {
    await approveAndApply(p.id, `sim-${p.id}`);
    return `${input.returnPath}?mp=ok`;
  }

  const base = await siteUrl();
  try {
    const pref = await mp.createOneTimePreference({
      title: input.title,
      amount: input.amount,
      externalReference: `pay:${p.id}`,
      payerEmail: input.payerEmail,
      backUrl: `${base}${input.returnPath}`,
      notificationUrl: `${base}/api/pagos/webhook`,
    });
    await db.mpPayment.update({ where: { id: p.id }, data: { mpPreferenceId: pref.id } });
    return pref.url;
  } catch (e) {
    // Si Mercado Pago lo rechazó, no queda un pago colgado.
    await db.mpPayment.delete({ where: { id: p.id } }).catch(() => {});
    await recordMpError("Pago único", e);
    throw e;
  }
}

// ───────────────────────── Avisos y vuelta del checkout ─────────────────────────

/**
 * Reconciliación de un pago de Mercado Pago (webhook o vuelta del checkout).
 * Devuelve false si el pago no es de la plataforma (ej. un trabajo).
 */
export async function handlePaymentNotice(mpPaymentId: string): Promise<boolean> {
  if (billingMode() !== "mercadopago") return false;
  const info = await mp.getPaymentInfo(mpPaymentId);
  const ref = info?.externalReference ?? "";
  if (!info) return false;

  if (ref.startsWith("pay:")) {
    const p = await db.mpPayment.findUnique({ where: { id: ref.slice(4) } });
    if (!p) return true;
    if (info.status === "approved" && info.amount >= p.amount - 0.01) {
      await approveAndApply(p.id, info.id);
    } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(info.status)) {
      await db.mpPayment.updateMany({ where: { id: p.id, status: "PENDING" }, data: { status: "REJECTED" } });
    }
    return true;
  }
  if (ref.startsWith("sub:")) {
    await syncSubscription(ref.slice(4));
    return true;
  }
  return false;
}

/** Avisos de suscripciones (si están configurados en el panel de Mercado Pago). */
export async function handleSubscriptionNotice(type: string, id: string): Promise<void> {
  if (billingMode() !== "mercadopago") return;
  let preapprovalId: string | undefined;
  if (type === "subscription_authorized_payment") {
    preapprovalId = (await mp.getAuthorizedPayment(id))?.preapproval_id;
  } else {
    preapprovalId = id;
  }
  if (!preapprovalId) return;
  const sub = await db.subscription.findUnique({ where: { mpPreapprovalId: preapprovalId } });
  if (sub) await syncSubscription(sub.id);
}

export type ReturnResult = "approved" | "pending" | "rejected" | "subscribed" | "sub-pending" | null;

/**
 * Lo que hay que mostrar al volver de Mercado Pago. Verifica contra la API
 * (no confía en los parámetros de la URL) y aplica lo que corresponda.
 */
export async function confirmReturn(
  userId: string,
  sp: { mp?: string; payment_id?: string; collection_id?: string; sid?: string }
): Promise<ReturnResult> {
  if (!sp.mp) return null;
  const mode = billingMode();

  if (sp.mp === "sub" && sp.sid) {
    const sub = await db.subscription.findUnique({ where: { id: sp.sid } });
    if (!sub || sub.userId !== userId) return null;
    if (mode === "mercadopago") await syncSubscription(sub.id).catch(() => {});
    const fresh = await db.subscription.findUnique({ where: { id: sub.id } });
    return fresh?.status === "AUTHORIZED" ? "subscribed" : "sub-pending";
  }

  const paymentId = sp.payment_id ?? sp.collection_id;
  if (mode === "mercadopago" && paymentId && /^\d+$/.test(paymentId)) {
    await handlePaymentNotice(paymentId).catch(() => {});
  }
  if (sp.mp === "ok") return "approved";
  if (sp.mp === "pendiente") return "pending";
  if (sp.mp === "error") return "rejected";
  return null;
}

/**
 * Suscripciones vigentes del usuario para mostrar en pantalla. Las que
 * esperan autorización o tienen un cobro vencido se sincronizan antes.
 */
export async function userSubscriptions(userId: string, kind: "PRO" | "PLAN") {
  const subs = await db.subscription.findMany({
    where: { userId, kind, status: { in: ["PENDING", "AUTHORIZED", "PAUSED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (billingMode() === "mercadopago") {
    const stale = subs.filter(
      (s) =>
        s.mpPreapprovalId &&
        (s.status === "PENDING" ||
          !s.syncedAt ||
          (s.nextPaymentAt && s.nextPaymentAt < new Date()) ||
          Date.now() - s.syncedAt.getTime() > 6 * 3600_000)
    );
    if (stale.length) {
      await Promise.all(stale.map((s) => syncSubscription(s.id).catch(() => {})));
      return db.subscription.findMany({
        where: { userId, kind, status: { in: ["PENDING", "AUTHORIZED", "PAUSED"] } },
        orderBy: { createdAt: "desc" },
      });
    }
  }
  return subs;
}

/**
 * Cron diario: sincroniza las suscripciones activas (y las recién creadas)
 * para acreditar los débitos mensuales aunque no llegue ningún webhook.
 */
export async function syncAllSubscriptions(): Promise<number> {
  if (billingMode() !== "mercadopago") return 0;
  const subs = await db.subscription.findMany({
    where: {
      mpPreapprovalId: { not: null },
      OR: [{ status: { in: ["AUTHORIZED", "PAUSED"] } }, { status: "PENDING", createdAt: { gt: new Date(Date.now() - 7 * DAY) } }],
    },
    select: { id: true },
    take: 500,
  });
  for (const s of subs) await syncSubscription(s.id).catch(() => {});
  return subs.length;
}
