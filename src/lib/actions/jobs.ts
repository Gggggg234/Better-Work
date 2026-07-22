"use server";

import { revalidatePath } from "next/cache";
import { needsPayment } from "@/lib/payments";
import { saveAttachment } from "@/lib/upload";
import { releaseForJob, refundForJob } from "@/lib/actions/jobPayments";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { genCode } from "@/lib/format";
import { isPlanActive } from "@/lib/plans";

/** Cliente crea una solicitud de trabajo para un trabajador, con fecha y
 *  horario propuestos. El pago se arregla directo entre las partes. */
export async function requestJob(formData: FormData) {
  const user = await requireUser();
  const workerId = String(formData.get("workerId"));
  const price = parseFloat(String(formData.get("price") ?? ""));
  const lat = parseFloat(String(formData.get("lat") ?? ""));
  const lng = parseFloat(String(formData.get("lng") ?? ""));

  // Empresa sin plan activo no puede contratar desde su perfil empresarial.
  if (user.role === "COMPANY") {
    const cp = await db.companyProfile.findUnique({ where: { userId: user.id } });
    if (!cp || !isPlanActive(cp.planActiveUntil)) redirect("/company/plan");
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

  // Adjuntos: fotos y documentos que ayudan al trabajador a presupuestar.
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  const saved = (await Promise.all(files.slice(0, 10).map((f) => saveAttachment(f)))).filter(
    (a): a is NonNullable<typeof a> => a != null
  );

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
      attachments: JSON.stringify(saved),
    },
  });
  // La marca `creada=1` dispara el banner de confirmación en la página del trabajo.
  redirect(`/jobs/${job.id}?creada=1`);
}

/** Registra cuánto tardó el trabajador en responder (señal del rango). */
async function trackResponseTime(workerId: string, requestedAt: Date) {
  const mins = Math.max(0, Math.round((Date.now() - requestedAt.getTime()) / 60000));
  const profile = await db.workerProfile.findUnique({
    where: { userId: workerId },
    select: { id: true, avgResponseMins: true, jobsDone: true },
  });
  if (!profile) return;
  // Media móvil simple: suaviza sin guardar el historial completo.
  const prev = profile.avgResponseMins;
  const next = prev == null ? mins : Math.round(prev * 0.7 + mins * 0.3);
  await db.workerProfile.update({ where: { id: profile.id }, data: { avgResponseMins: next } });
}

/** Trabajador acepta: se generan los códigos de inicio y finalización. */
export async function acceptJob(jobId: string) {
  const user = await requireRole("WORKER");
  const job = await db.job.findUnique({ where: { id: jobId }, select: { requestedAt: true, status: true, workerId: true } });
  await db.job.updateMany({
    where: { id: jobId, workerId: user.id, status: "REQUESTED" },
    data: { status: "ACCEPTED", acceptedAt: new Date(), startCode: genCode(), endCode: genCode() },
  });
  if (job && job.workerId === user.id && job.status === "REQUESTED") {
    await trackResponseTime(user.id, job.requestedAt);
  }
  revalidatePath(`/jobs/${jobId}`);
}

export async function rejectJob(jobId: string) {
  const user = await requireRole("WORKER");
  const job = await db.job.findUnique({ where: { id: jobId }, select: { requestedAt: true, status: true, workerId: true } });
  await db.job.updateMany({
    where: { id: jobId, workerId: user.id, status: "REQUESTED" },
    data: { status: "REJECTED" },
  });
  if (job && job.workerId === user.id && job.status === "REQUESTED") {
    await trackResponseTime(user.id, job.requestedAt);
  }
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
  const job = await db.job.findUnique({ where: { id: jobId }, include: { payment: true } });
  if (!job || job.workerId !== user.id) return;
  if (!["ACCEPTED", "EN_ROUTE"].includes(job.status)) return;
  // No arranca hasta que el pago esté retenido por Better Work.
  if (needsPayment(job.price, job.payment)) {
    redirect(`/jobs/${jobId}?error=pago`);
  }
  if (job.startCode !== code) {
    redirect(`/jobs/${jobId}?error=codigo`);
  }
  await db.job.update({
    where: { id: jobId },
    data: { status: "WORKING", startedAt: new Date() },
  });
  revalidatePath(`/jobs/${jobId}`);
}

/** El trabajador ingresa el código de finalización: cierra el trabajo y
 *  habilita las calificaciones. */
export async function enterEndCode(jobId: string, formData: FormData): Promise<void> {
  const user = await requireRole("WORKER");
  const code = String(formData.get("code") ?? "").trim();
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.workerId !== user.id || job.status !== "WORKING") return;
  if (job.endCode !== code) {
    redirect(`/jobs/${jobId}?error=codigo`);
  }

  await db.job.update({
    where: { id: jobId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await db.workerProfile.update({
    where: { userId: user.id },
    data: { jobsDone: { increment: 1 } },
  });
  // Recién ahora se libera el dinero al profesional (con la comisión descontada).
  await releaseForJob(jobId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function cancelJob(jobId: string) {
  const user = await requireUser();
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return;
  const isParty = job.clientId === user.id || job.workerId === user.id;
  if (!isParty || !["REQUESTED", "ACCEPTED", "EN_ROUTE"].includes(job.status)) return;

  await db.job.update({ where: { id: jobId }, data: { status: "CANCELLED" } });
  // Si el cliente ya había pagado, se le devuelve.
  await refundForJob(jobId);
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

  // Si el calificado es trabajador, recalcular promedios (rating y puntualidad).
  const ratedUser = await db.user.findUnique({ where: { id: ratedId }, include: { workerProfile: true } });
  if (ratedUser?.workerProfile) {
    const agg = await db.review.aggregate({
      where: { ratedId },
      _avg: { stars: true, punctuality: true },
      _count: { stars: true },
    });
    await db.workerProfile.update({
      where: { userId: ratedId },
      data: {
        ratingAvg: agg._avg.stars ?? 0,
        ratingCount: agg._count.stars,
        punctualityAvg: agg._avg.punctuality ?? 0,
      },
    });
  }

  revalidatePath(`/jobs/${jobId}`);
}
