"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { trySaveImage } from "@/lib/upload";
import { getOrCreateWallet, MIN_TOPUP } from "@/lib/wallet";

/**
 * La persona transfiere y sube el comprobante para cargar su billetera de
 * publicidad. El saldo NO se acredita acá: queda pendiente hasta que el Super
 * Admin lo apruebe.
 */
export async function requestTopUp(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "WORKER" && user.role !== "COMPANY") redirect("/app");

  const amount = Math.round(parseFloat(String(formData.get("amount") ?? "0")) || 0);
  if (amount < MIN_TOPUP) redirect("/ads/wallet?error=monto");

  const wallet = await getOrCreateWallet(user.id);

  // Una sola carga en revisión por vez: evita comprobantes duplicados.
  const pending = await db.walletTopUp.findFirst({
    where: { walletId: wallet.id, status: "PENDING" },
  });
  if (pending) redirect("/ads/wallet?error=pendiente");

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) redirect("/ads/wallet?error=comprobante");

  const receiptUrl = await trySaveImage(file as File);
  if (!receiptUrl) redirect("/ads/wallet?error=archivo");

  await db.walletTopUp.create({
    data: { walletId: wallet.id, amount, receiptUrl },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/ads/wallet");
  redirect("/ads/wallet?ok=enviado");
}

/** El Super Admin acredita el saldo. Recién acá el dinero queda disponible. */
export async function approveTopUp(topUpId: string): Promise<void> {
  await requireRole("ADMIN");

  const topUp = await db.walletTopUp.findUnique({ where: { id: topUpId } });
  // Sólo se procesa una vez: si ya se revisó, no se vuelve a acreditar.
  if (!topUp || topUp.status !== "PENDING") return;

  await db.$transaction([
    db.walletTopUp.update({
      where: { id: topUp.id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
    db.adWallet.update({
      where: { id: topUp.walletId },
      data: { balance: { increment: topUp.amount } },
    }),
  ]);

  revalidatePath("/admin", "layout");
  revalidatePath("/ads/wallet");
  revalidatePath("/ads");
}

/** Rechaza la carga con un motivo, que se le muestra al usuario. */
export async function rejectTopUp(topUpId: string, formData: FormData): Promise<void> {
  await requireRole("ADMIN");

  const reason = String(formData.get("note") ?? "").trim().slice(0, 300);
  const topUp = await db.walletTopUp.findUnique({ where: { id: topUpId } });
  if (!topUp || topUp.status !== "PENDING") return;

  await db.walletTopUp.update({
    where: { id: topUp.id },
    data: { status: "REJECTED", reviewedAt: new Date(), note: reason },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/ads/wallet");
}
