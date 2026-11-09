"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { getProConfig } from "@/lib/pro";
import { MIN_TOPUP } from "@/lib/wallet";
import { startSubscription, startCheckout, cancelSubscriptionFor } from "@/lib/billing";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** El email de la cuenta de Mercado Pago con la que va a pagar (puede no ser el de Manobra). */
function payerEmail(formData: FormData, fallback: string): string | null {
  const v = String(formData.get("payerEmail") ?? "").trim().toLowerCase() || fallback;
  return EMAIL.test(v) ? v : null;
}

/**
 * Corre el inicio del cobro y manda a Mercado Pago. Si Mercado Pago lo
 * rechaza, vuelve a la pantalla con un aviso (el `redirect` va fuera del
 * try: internamente es una excepción).
 */
async function go(start: () => Promise<string>, errorPath: string): Promise<never> {
  let url: string;
  try {
    url = await start();
  } catch (e) {
    console.error("[billing]", e);
    redirect(`${errorPath}?error=mp`);
  }
  redirect(url);
}

// ── Manobra Pro ──

export async function subscribePro(formData: FormData): Promise<void> {
  const user = await requireRole("WORKER");
  const email = payerEmail(formData, user.email);
  if (!email) redirect("/pro?error=email");
  const { price } = await getProConfig();
  await go(
    () =>
      startSubscription({
        userId: user.id,
        kind: "PRO",
        amount: price,
        payerEmail: email,
        reason: "Manobra Pro (mensual)",
        returnPath: "/pro",
      }),
    "/pro"
  );
}

export async function payProOnce(): Promise<void> {
  const user = await requireRole("WORKER");
  const { price } = await getProConfig();
  await go(
    () =>
      startCheckout({
        userId: user.id,
        payerEmail: user.email,
        kind: "PRO",
        amount: price,
        days: 30,
        title: "Manobra Pro · 30 días",
        returnPath: "/pro",
      }),
    "/pro"
  );
}

// ── Membresías de empresa ──

async function activePlan(formData: FormData) {
  const key = String(formData.get("planKey") ?? "");
  const plan = await db.plan.findUnique({ where: { key } });
  return plan && plan.active ? plan : null;
}

export async function subscribePlan(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const plan = await activePlan(formData);
  if (!plan) redirect("/company/plan?error=plan");
  const email = payerEmail(formData, user.email);
  if (!email) redirect("/company/plan?error=email");
  await go(
    () =>
      startSubscription({
        userId: user.id,
        kind: "PLAN",
        planKey: plan.key,
        amount: plan.price,
        payerEmail: email,
        reason: `Manobra · Plan ${plan.name} (mensual)`,
        returnPath: "/company/plan",
      }),
    "/company/plan"
  );
}

export async function payPlanOnce(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const plan = await activePlan(formData);
  if (!plan) redirect("/company/plan?error=plan");
  await go(
    () =>
      startCheckout({
        userId: user.id,
        payerEmail: user.email,
        kind: "PLAN",
        refKey: plan.key,
        amount: plan.price,
        days: 30,
        title: `Manobra · Plan ${plan.name} · 30 días`,
        returnPath: "/company/plan",
      }),
    "/company/plan"
  );
}

// ── Billetera de publicidad ──

export async function topUpWithMp(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "WORKER" && user.role !== "COMPANY") redirect("/app");
  const amount = Math.round(parseFloat(String(formData.get("amount") ?? "0")) || 0);
  if (amount < MIN_TOPUP || amount > 5_000_000) redirect("/ads/wallet?error=monto");
  await go(
    () =>
      startCheckout({
        userId: user.id,
        payerEmail: user.email,
        kind: "WALLET",
        amount,
        days: 0,
        title: "Manobra · Saldo de publicidad",
        returnPath: "/ads/wallet",
      }),
    "/ads/wallet"
  );
}

// ── Cancelar débito automático ──

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const user = await requireUser();
  try {
    await cancelSubscriptionFor(user.id, subscriptionId);
  } catch (e) {
    console.error("[billing] cancelar", e);
  }
  revalidatePath("/pro");
  revalidatePath("/company/plan");
}
