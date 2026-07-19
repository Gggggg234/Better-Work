"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * Constancias de pago entre cliente y trabajador.
 *
 * Ver `lib/payments.ts` para el diseño. Acá no se mueve dinero: se registra
 * que el cliente transfirió y que el trabajador lo reconoció. Por eso no
 * interviene ningún administrador — es un acuerdo entre las dos partes.
 */

/** El cliente declara que ya transfirió la seña o el saldo. */
export async function declarePayment(jobId: string, kind: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  if (kind !== "DEPOSIT" && kind !== "FINAL") redirect(`/jobs/${jobId}`);

  const job = await db.job.findUnique({ where: { id: jobId }, include: { payments: true } });
  if (!job || job.clientId !== user.id) redirect("/jobs");

  // La seña se paga antes de empezar; el saldo, cuando el trabajo terminó.
  const validStatus =
    kind === "DEPOSIT"
      ? ["ACCEPTED", "EN_ROUTE"].includes(job.status)
      : ["WORKING", "COMPLETED"].includes(job.status);
  if (!validStatus) redirect(`/jobs/${jobId}?error=estado`);

  const amount =
    kind === "DEPOSIT" ? (job.deposit ?? 0) : Math.max(0, (job.price ?? 0) - (job.deposit ?? 0));
  if (amount <= 0) redirect(`/jobs/${jobId}?error=monto`);

  const note = String(formData.get("note") ?? "").trim().slice(0, 120);

  // `upsert` sobre la clave (jobId, kind): reenviar no duplica el registro.
  await db.payment.upsert({
    where: { jobId_kind: { jobId, kind } },
    create: { jobId, kind, amount, note, status: "SENT" },
    update: { note },
  });

  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}?ok=${kind === "DEPOSIT" ? "sena" : "saldo"}`);
}

/** El trabajador confirma que recibió el dinero. Habilita el paso siguiente. */
export async function confirmReceived(jobId: string, kind: string): Promise<void> {
  const user = await requireUser();

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.workerId !== user.id) redirect("/jobs");

  // Sólo confirma quien cobra, y sólo un pago que el cliente declaró.
  await db.payment.updateMany({
    where: { jobId, kind, status: "SENT" },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });

  revalidatePath(`/jobs/${jobId}`);
}

/**
 * El trabajador avisa que el pago no le llegó: vuelve a quedar pendiente para
 * que el cliente lo revise. No se borra el monto, sólo la declaración.
 */
export async function rejectReceived(jobId: string, kind: string): Promise<void> {
  const user = await requireUser();

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.workerId !== user.id) redirect("/jobs");

  await db.payment.deleteMany({ where: { jobId, kind, status: "SENT" } });

  revalidatePath(`/jobs/${jobId}`);
}
