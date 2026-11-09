"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { trySaveImage } from "@/lib/upload";
import { PRO_DAYS, extendPro, getProConfig } from "@/lib/pro";
import { sendProApprovedEmail, sendProRejectedEmail } from "@/lib/mail";
import { notify } from "@/lib/notify";

/**
 * El profesional envía el comprobante de la transferencia de Pro. No se
 * activa nada acá: queda PENDING hasta que el Super Admin lo valida.
 */
export async function requestPro(formData: FormData): Promise<void> {
  const user = await requireRole("WORKER");

  // Una sola solicitud en revisión por vez: evita comprobantes duplicados.
  const pending = await db.proRequest.findFirst({ where: { userId: user.id, status: "PENDING" } });
  if (pending) redirect("/pro?error=pendiente");

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) redirect("/pro?error=comprobante");
  const receiptUrl = await trySaveImage(file);
  if (!receiptUrl) redirect("/pro?error=archivo");

  const { price } = await getProConfig();
  await db.proRequest.create({ data: { userId: user.id, amount: price, days: PRO_DAYS, receiptUrl } });

  revalidatePath("/admin", "layout");
  redirect("/pro?ok=enviado");
}

/** El Super Admin valida el pago: recién acá se activa (o extiende) Pro. */
export async function approveProRequest(requestId: string): Promise<void> {
  await requireRole("ADMIN");

  const req = await db.proRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, email: true } } },
  });
  // Sólo se procesa una vez: si ya se revisó, no se vuelve a aplicar.
  if (!req || req.status !== "PENDING") return;
  const marked = await db.proRequest.updateMany({
    where: { id: req.id, status: "PENDING" },
    data: { status: "APPROVED", reviewedAt: new Date() },
  });
  if (marked.count !== 1) return;

  const until = await extendPro(req.user.id, req.days);
  // Registro contable, junto a membresías y publicidad.
  await db.promotion.create({
    data: { userId: req.user.id, kind: "WORKER_PRO", refId: "pro", days: req.days, amount: req.amount },
  });

  if (until) await sendProApprovedEmail(req.user.email, until).catch(() => {});
  await notify(req.user.id, {
    title: "¡Ya sos Pro!",
    body: "Aprobamos tu pago. Ya aparecés más arriba y mandás presupuestos sin límite.",
    url: "/pro",
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/pro");
  revalidatePath("/app");
}

/** Rechaza el comprobante. El profesional puede volver a enviarlo. */
export async function rejectProRequest(requestId: string, formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const reason = String(formData.get("note") ?? "").trim().slice(0, 300);

  const req = await db.proRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!req || req.status !== "PENDING") return;

  await db.proRequest.update({
    where: { id: req.id },
    data: { status: "REJECTED", reviewedAt: new Date(), note: reason },
  });
  await sendProRejectedEmail(req.user.email, reason).catch(() => {});
  await notify(req.user.id, {
    title: "No pudimos validar tu comprobante de Pro",
    body: reason || "Revisalo y volvé a enviarlo.",
    url: "/pro",
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/pro");
}
