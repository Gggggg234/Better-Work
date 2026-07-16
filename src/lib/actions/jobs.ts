"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { genCode } from "@/lib/format";
import { getPaymentProvider } from "@/lib/payments";

/** Cliente crea una solicitud de trabajo para un trabajador, con fecha y
 *  horario propuestos. El pago se procesa a través de Better Work. */
export async function requestJob(formData: FormData) {
  const user = await requireUser();
  const workerId = String(formData.get("workerId"));
  const price = parseFloat(String(formData.get("price") ?? ""));
  const lat = parseFloat(String(formData.get("lat") ?? ""));
  const lng = parseFloat(String(formData.get("lng") ?? ""));

  // Empresa sin plan activo no puede contratar desde su perfil empresarial.
  if (user.role === "COMPANY") {
    const cp = await db.companyProfile.findUnique({ where: { userId: user.id } });
    if (!cp || !cp.planActiveUntil || cp.planActiveUntil < new Date()) redirect("/company/plan");
  }

  const worker = await db.user.findUnique({ where: { id: workerId } });
  if (!worker || worker.suspended) redirect(`/w/${workerId}`);

  // Fecha + hora propuestas por el cliente (selectores del formulario).
  let scheduledFor: Date | null = null;
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)) {
    const parsed = new Date(`${date}T${time}:00`);
    if (!Number.isNaN(parsed.getTime())) scheduledFor = parsed;
  }

  const job = await db.job.create({
    data: {
      clientId: user.id,
      workerId,
      title: String(formData.get("title") ?? "").trim() || "Trabajo",
      description: String(formData.get("description") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      scheduledFor,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      price: Number.isFinite(price) ? price : null,
      payMethod: "PLATFORM",
    },
  });
  redirect(`/jobs/${job.id}`);
}

/** Trabajador acepta: se generan los códigos de inicio y finalización. */
export async function acceptJob(jobId: string) {
  const user = await requireRole("WORKER");
  await db.job.updateMany({
    where: { id: jobId, workerId: user.id, status: "REQUESTED" },
    data: { status: "ACCEPTED", acceptedAt: new Date(), startCode: genCode(), endCode: genCode() },
  });
  revalidatePath(`/jobs/${jobId}`);
}

export async function rejectJob(jobId: string) {
  const user = await requireRole("WORKER");
  await db.job.updateMany({
    where: { id: jobId, workerId: user.id, status: "REQUESTED" },
    data: { status: "REJECTED" },
  });
  revalidatePath(`/jobs/${jobId}`);
}

export async function setEnRoute(jobId: string) {
  const user = await requireRole("WORKER");
  await db.job.updateMany({
    where: { id: jobId, workerId: user.id, status: "ACCEPTED" },
    data: { status: "EN_ROUTE" },
  });
  revalidatePath(`/jobs/${jobId}`);
}

/** El trabajador ingresa el código de inicio que le comparte el cliente. */
export async function enterStartCode(jobId: string, formData: FormData): Promise<void> {
  const user = await requireRole("WORKER");
  const code = String(formData.get("code") ?? "").trim();
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.workerId !== user.id) return;
  if (!["ACCEPTED", "EN_ROUTE"].includes(job.status)) return;
  if (job.startCode !== code) {
    redirect(`/jobs/${jobId}?error=codigo`);
  }
  await db.job.update({
    where: { id: jobId },
    data: { status: "WORKING", startedAt: new Date() },
  });
  revalidatePath(`/jobs/${jobId}`);
}

/** El trabajador ingresa el código de finalización: cierra el trabajo, libera
 *  el pago retenido por Better Work (neto de comisión) y habilita las
 *  calificaciones. */
export async function enterEndCode(jobId: string, formData: FormData): Promise<void> {
  const user = await requireRole("WORKER");
  const code = String(formData.get("code") ?? "").trim();
  const job = await db.job.findUnique({ where: { id: jobId }, include: { payment: true } });
  if (!job || job.workerId !== user.id || job.status !== "WORKING") return;
  if (job.endCode !== code) {
    redirect(`/jobs/${jobId}?error=codigo`);
  }

  await db.job.update({
    where: { id: jobId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // Liberar el pago retenido: transferir el neto al trabajador.
  if (job.payment && job.payment.status === "HELD") {
    const payout = await db.paymentAccount.findFirst({
      where: { userId: user.id, purpose: "PAYOUT", isDefault: true },
    });
    const result = await getPaymentProvider().payout({
      jobId: job.id,
      payeeId: user.id,
      amount: job.payment.netAmount,
      accountId: payout?.id ?? null,
      chargeRef: job.payment.providerRef,
    });
    if (result.ok) {
      await db.payment.update({
        where: { id: job.payment.id },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
    }
  }

  await db.workerProfile.update({
    where: { userId: user.id },
    data: { jobsDone: { increment: 1 } },
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function cancelJob(jobId: string) {
  const user = await requireUser();
  const job = await db.job.findUnique({ where: { id: jobId }, include: { payment: true } });
  if (!job) return;
  const isParty = job.clientId === user.id || job.workerId === user.id;
  if (!isParty || !["REQUESTED", "ACCEPTED", "EN_ROUTE"].includes(job.status)) return;

  await db.job.update({ where: { id: jobId }, data: { status: "CANCELLED" } });

  // Si el cliente ya había pagado, se devuelve el cobro retenido.
  if (job.payment && job.payment.status === "HELD") {
    const result = await getPaymentProvider().refund(job.payment.providerRef, job.payment.amount);
    if (result.ok) {
      await db.payment.update({ where: { id: job.payment.id }, data: { status: "REFUNDED" } });
    }
  }

  if (job.workerId === user.id) {
    await db.workerProfile.update({
      where: { userId: user.id },
      data: { cancellations: { increment: 1 } },
    });
  }
  revalidatePath(`/jobs/${jobId}`);
}

/** Calificación mutua al finalizar. */
export async function rateJob(jobId: string, formData: FormData) {
  const user = await requireUser();
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "COMPLETED") return;
  const isClient = job.clientId === user.id;
  const isWorker = job.workerId === user.id;
  if (!isClient && !isWorker) return;

  const ratedId = isClient ? job.workerId : job.clientId;
  const stars = Math.min(5, Math.max(1, parseInt(String(formData.get("stars") ?? "5")) || 5));
  const sub = (k: string) => Math.min(5, Math.max(0, parseInt(String(formData.get(k) ?? "0")) || 0));

  await db.review.upsert({
    where: { jobId_raterId: { jobId, raterId: user.id } },
    create: {
      jobId,
      raterId: user.id,
      ratedId,
      stars,
      punctuality: sub("punctuality"),
      quality: sub("quality"),
      communication: sub("communication"),
      compliance: sub("compliance"),
      comment: String(formData.get("comment") ?? "").trim(),
    },
    update: {},
  });

  // Si el calificado es trabajador, recalcular su promedio.
  const ratedUser = await db.user.findUnique({ where: { id: ratedId }, include: { workerProfile: true } });
  if (ratedUser?.workerProfile) {
    const agg = await db.review.aggregate({
      where: { ratedId },
      _avg: { stars: true },
      _count: { stars: true },
    });
    await db.workerProfile.update({
      where: { userId: ratedId },
      data: { ratingAvg: agg._avg.stars ?? 0, ratingCount: agg._count.stars },
    });
  }

  revalidatePath(`/jobs/${jobId}`);
}
