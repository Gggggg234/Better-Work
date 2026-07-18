"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { trySaveImage } from "@/lib/upload";

/**
 * Transiciones del pago retenido.
 *
 * Ver `lib/payments.ts` para el diseño completo. Todas las funciones que
 * cambian de estado están acá para que integrar un proveedor sea llamarlas
 * desde su webhook en vez de desde un formulario.
 */

/** El cliente transfiere el importe y sube el comprobante. Queda PENDING. */
export async function payJob(jobId: string, formData: FormData): Promise<void> {
  const user = await requireUser();

  const job = await db.job.findUnique({ where: { id: jobId }, include: { payment: true } });
  if (!job || job.clientId !== user.id) redirect("/jobs");
  if (job.payment) redirect(`/jobs/${jobId}`); // ya hay un pago en curso
  if (!job.price || job.price <= 0) redirect(`/jobs/${jobId}?error=sinprecio`);
  // Se paga después de que el profesional acepta y antes de que empiece.
  if (!["ACCEPTED", "EN_ROUTE"].includes(job.status)) redirect(`/jobs/${jobId}?error=estado`);

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) redirect(`/jobs/${jobId}?error=comprobante`);

  const receiptUrl = await trySaveImage(file as File);
  if (!receiptUrl) redirect(`/jobs/${jobId}?error=archivo`);

  await db.payment.create({
    data: { jobId: job.id, amount: job.price, status: "PENDING", method: "MANUAL", receiptUrl },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/admin", "layout");
  redirect(`/jobs/${jobId}?ok=pago`);
}

/**
 * El Super Admin confirma que la transferencia llegó: el dinero pasa a estar
 * RETENIDO y el trabajo puede empezar.
 *
 * Con una pasarela real, esto lo dispararía el webhook en vez de una persona.
 */
export async function confirmPayment(paymentId: string): Promise<void> {
  await requireRole("ADMIN");

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "PENDING") return;

  await db.payment.update({
    where: { id: payment.id },
    data: { status: "HELD", heldAt: new Date() },
  });

  revalidatePath(`/jobs/${payment.jobId}`);
  revalidatePath("/admin", "layout");
}

/** El Super Admin rechaza el comprobante: el cliente puede volver a enviarlo. */
export async function rejectPayment(paymentId: string): Promise<void> {
  await requireRole("ADMIN");

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "PENDING") return;

  // Se borra para que el cliente pueda cargar otro comprobante.
  await db.payment.delete({ where: { id: payment.id } });

  revalidatePath(`/jobs/${payment.jobId}`);
  revalidatePath("/admin", "layout");
}

/**
 * Libera el dinero al profesional. Se llama SOLO desde `enterEndCode`, al
 * confirmarse el código de finalización: el trabajador nunca cobra antes.
 */
export async function releaseForJob(jobId: string): Promise<void> {
  await db.payment.updateMany({
    where: { jobId, status: "HELD" },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
}

/** Devuelve el dinero al cliente. Se llama al cancelarse el trabajo. */
export async function refundForJob(jobId: string): Promise<void> {
  await db.payment.updateMany({
    where: { jobId, status: { in: ["PENDING", "HELD"] } },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });
}
