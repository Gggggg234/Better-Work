"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notify } from "@/lib/notify";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { genCode, formatMoney } from "@/lib/format";

/**
 * Negociación por presupuesto.
 *
 * El trabajador cotiza (precio + tiempo estimado + observaciones) sobre una
 * solicitud. El cliente lo acepta —fija el precio y el trabajo pasa a
 * ACCEPTED—, lo rechaza, o pide cambios y el trabajador manda uno nuevo.
 */

/** El trabajador envía un presupuesto para una solicitud (job REQUESTED). */
export async function sendQuote(jobId: string, formData: FormData): Promise<void> {
  const user = await requireRole("WORKER");

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { workerId: true, clientId: true, title: true, status: true },
  });
  if (!job || job.workerId !== user.id || job.status !== "REQUESTED") redirect(`/jobs/${jobId}`);

  const price = Math.round(parseFloat(String(formData.get("price") ?? "")) || 0);
  if (price <= 0) redirect(`/jobs/${jobId}?error=presupuesto`);

  const estimatedTime = String(formData.get("estimatedTime") ?? "").trim().slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  await db.quote.create({
    data: { jobId, price, estimatedTime, note, status: "PENDING" },
  });
  after(() =>
    notify(job.clientId, {
      title: `${user.name.split(" ")[0]} te pasó un presupuesto: ${formatMoney(price)}`,
      body: job.title,
      url: `/jobs/${jobId}`,
    })
  );

  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}?ok=presupuesto`);
}

/** El cliente acepta el presupuesto: fija el precio y el trabajo pasa a ACCEPTED. */
export async function acceptQuote(jobId: string, quoteId: string): Promise<void> {
  const user = await requireUser();

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { clientId: true, workerId: true, title: true, status: true },
  });
  if (!job || job.clientId !== user.id || job.status !== "REQUESTED") redirect(`/jobs/${jobId}`);

  const quote = await db.quote.findUnique({ where: { id: quoteId } });
  if (!quote || quote.jobId !== jobId || quote.status !== "PENDING") redirect(`/jobs/${jobId}`);

  // Acepta el presupuesto y arranca el trabajo con ese precio y sus códigos.
  await db.$transaction([
    db.quote.update({ where: { id: quoteId }, data: { status: "ACCEPTED" } }),
    db.job.update({
      where: { id: jobId },
      data: {
        price: quote.price,
        status: "ACCEPTED",
        acceptedAt: new Date(),
        startCode: genCode(),
        endCode: genCode(),
      },
    }),
  ]);
  after(() =>
    notify(job.workerId, {
      title: `🎉 ${user.name.split(" ")[0]} aceptó tu presupuesto`,
      body: job.title,
      url: `/jobs/${jobId}`,
    })
  );

  revalidatePath(`/jobs/${jobId}`);
}

/** El cliente rechaza el presupuesto y cancela la solicitud. */
export async function rejectQuote(jobId: string, quoteId: string): Promise<void> {
  const user = await requireUser();

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { clientId: true, workerId: true, title: true, status: true },
  });
  if (!job || job.clientId !== user.id || job.status !== "REQUESTED") redirect(`/jobs/${jobId}`);

  await db.$transaction([
    db.quote.updateMany({ where: { id: quoteId, jobId, status: "PENDING" }, data: { status: "REJECTED" } }),
    db.job.update({ where: { id: jobId }, data: { status: "CANCELLED" } }),
  ]);
  after(() =>
    notify(job.workerId, { title: `${user.name.split(" ")[0]} rechazó tu presupuesto`, body: job.title, url: `/jobs/${jobId}` })
  );

  revalidatePath(`/jobs/${jobId}`);
}

/** El cliente pide cambios: el presupuesto vuelve al trabajador para re-cotizar. */
export async function requestQuoteChanges(jobId: string, quoteId: string, formData: FormData): Promise<void> {
  const user = await requireUser();

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { clientId: true, workerId: true, title: true, status: true },
  });
  if (!job || job.clientId !== user.id) redirect(`/jobs/${jobId}`);

  const clientNote = String(formData.get("clientNote") ?? "").trim().slice(0, 400);

  await db.quote.updateMany({
    where: { id: quoteId, jobId, status: "PENDING" },
    data: { status: "CHANGES", clientNote },
  });
  after(() =>
    notify(job.workerId, {
      title: `${user.name.split(" ")[0]} te pidió cambios en el presupuesto`,
      body: clientNote || job.title,
      url: `/jobs/${jobId}`,
    })
  );

  revalidatePath(`/jobs/${jobId}`);
}
