"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import { fulfillCharge } from "@/lib/payments/fulfill";

const PAYMENT_PROVIDERS = ["CARD_CREDIT", "CARD_DEBIT", "MERCADO_PAGO", "WALLET"];
const PAYOUT_PROVIDERS = ["MERCADO_PAGO", "BANK", "WALLET"];

/** Agrega una cuenta de pago (cliente) o de cobro (trabajador). */
export async function addPaymentAccount(formData: FormData): Promise<void> {
  const user = await requireUser();
  const purpose = user.role === "WORKER" ? "PAYOUT" : "PAYMENT";
  const allowed = purpose === "PAYOUT" ? PAYOUT_PROVIDERS : PAYMENT_PROVIDERS;

  const provider = String(formData.get("provider") ?? "");
  if (!allowed.includes(provider)) return;

  const holder = String(formData.get("holder") ?? "").trim();
  let detail = String(formData.get("detail") ?? "").trim();
  // Tarjetas: solo los últimos 4 dígitos, nunca el número completo.
  if (provider.startsWith("CARD")) detail = detail.replace(/\D/g, "").slice(-4);
  if (!detail) redirect("/payments?error=detalle");

  const label = String(formData.get("label") ?? "").trim() ||
    (provider === "CARD_CREDIT" ? "Tarjeta de crédito"
      : provider === "CARD_DEBIT" ? "Tarjeta de débito"
      : provider === "MERCADO_PAGO" ? "Mercado Pago"
      : provider === "BANK" ? "Cuenta bancaria"
      : "Billetera virtual");

  const existing = await db.paymentAccount.count({ where: { userId: user.id, purpose } });
  await db.paymentAccount.create({
    data: { userId: user.id, purpose, provider, label, holder, detail, isDefault: existing === 0 },
  });
  revalidatePath("/payments");
}

export async function deletePaymentAccount(accountId: string): Promise<void> {
  const user = await requireUser();
  const acc = await db.paymentAccount.findUnique({ where: { id: accountId } });
  if (!acc || acc.userId !== user.id) return;
  await db.paymentAccount.delete({ where: { id: accountId } });
  // Si era la predeterminada, promover otra.
  if (acc.isDefault) {
    const next = await db.paymentAccount.findFirst({
      where: { userId: user.id, purpose: acc.purpose },
      orderBy: { createdAt: "asc" },
    });
    if (next) await db.paymentAccount.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath("/payments");
}

export async function setDefaultPaymentAccount(accountId: string): Promise<void> {
  const user = await requireUser();
  const acc = await db.paymentAccount.findUnique({ where: { id: accountId } });
  if (!acc || acc.userId !== user.id) return;
  await db.$transaction([
    db.paymentAccount.updateMany({
      where: { userId: user.id, purpose: acc.purpose },
      data: { isDefault: false },
    }),
    db.paymentAccount.update({ where: { id: accountId }, data: { isDefault: true } }),
  ]);
  revalidatePath("/payments");
}

/**
 * El cliente paga el trabajo a través de Better Work. La plataforma cobra,
 * retiene la comisión configurada y deja el pago en estado HELD hasta que el
 * trabajo finaliza (código de finalización) — recién ahí se libera el neto.
 *
 * Con Mercado Pago el cobro es por redirección: mandamos al checkout y el
 * webhook confirma el pago. Con el proveedor simulado se acredita al instante.
 */
export async function payJob(jobId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const job = await db.job.findUnique({ where: { id: jobId }, include: { payment: true } });
  if (!job || job.clientId !== user.id) return;
  if (job.payment) return; // ya pagado
  if (!job.price || job.price <= 0) return;
  if (!["ACCEPTED", "EN_ROUTE", "WORKING", "COMPLETED"].includes(job.status)) return;

  const accountId = String(formData.get("accountId") ?? "") || null;
  if (accountId) {
    const acc = await db.paymentAccount.findUnique({ where: { id: accountId } });
    if (!acc || acc.userId !== user.id || acc.purpose !== "PAYMENT") return;
  }

  const result = await getPaymentProvider().charge({
    subject: { type: "JOB", jobId: job.id },
    payerId: user.id,
    amount: job.price,
    description: job.title,
    accountId,
  });
  if (!result.ok) redirect(`/jobs/${jobId}?error=pago`);

  if (result.kind === "redirect") redirect(result.redirectUrl);

  await fulfillCharge({ type: "JOB", jobId: job.id }, result.providerRef, user.id, job.price);
  revalidatePath(`/jobs/${jobId}`);
}
