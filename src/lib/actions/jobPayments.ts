"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import { splitAmount } from "@/lib/payments/escrow";
import { getCommissionPct } from "@/lib/settings";

/**
 * Acciones del pago retenido (escrow) de un trabajo.
 *
 * El cliente paga después de que el trabajador acepta. El dinero queda HELD y
 * sólo se libera al confirmarse el código de finalización, descontando la
 * comisión. Todo pasa por `getPaymentProvider()`, así que integrar Mercado Pago
 * es sólo cargar sus credenciales: sin ellas se usa el proveedor simulado.
 */

/** El cliente inicia el pago del trabajo. Redirige al checkout o retiene ya. */
export async function startPayment(jobId: string): Promise<void> {
  const user = await requireUser();

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { payment: true, worker: { select: { name: true } } },
  });
  if (!job || job.clientId !== user.id) redirect("/jobs");
  if (!job.price || job.price <= 0) redirect(`/jobs/${jobId}?pago=sinprecio`);
  // Se paga tras aceptar y antes de empezar; si ya está retenido, no se repite.
  if (!["ACCEPTED", "EN_ROUTE"].includes(job.status)) redirect(`/jobs/${jobId}?pago=estado`);
  if (job.payment && ["HELD", "RELEASED"].includes(job.payment.status)) redirect(`/jobs/${jobId}`);

  const provider = getPaymentProvider();

  let result;
  try {
    result = await provider.createCheckout({
      jobId: job.id,
      amount: job.price,
      title: `Better Work — ${job.title}`,
      payerEmail: user.email,
    });
  } catch {
    redirect(`/jobs/${jobId}?pago=error`);
  }

  // Registro del pago (uno por trabajo). Si el proveedor retiene al instante
  // (simulado) queda HELD; si redirige (Mercado Pago) queda PENDING hasta el
  // webhook.
  const held = result.kind === "held";
  await db.payment.upsert({
    where: { jobId: job.id },
    create: {
      jobId: job.id,
      amount: job.price,
      method: provider.id,
      providerRef: result.providerRef,
      status: held ? "HELD" : "PENDING",
      heldAt: held ? new Date() : null,
    },
    update: {
      method: provider.id,
      providerRef: result.providerRef,
      status: held ? "HELD" : "PENDING",
      heldAt: held ? new Date() : null,
    },
  });

  revalidatePath(`/jobs/${jobId}`);

  if (result.kind === "redirect") redirect(result.url);
  redirect(`/jobs/${jobId}?pago=ok`);
}

/**
 * Libera el dinero al profesional y descuenta la comisión.
 * Se llama SOLO desde `enterEndCode`: el trabajador nunca cobra antes.
 */
export async function releaseForJob(jobId: string): Promise<void> {
  const payment = await db.payment.findUnique({ where: { jobId } });
  if (!payment || payment.status !== "HELD") return;

  const pct = await getCommissionPct();
  const { commission } = splitAmount(payment.amount, pct);

  await db.payment.update({
    where: { jobId },
    data: { status: "RELEASED", releasedAt: new Date(), commission },
  });
}

/** Devuelve el dinero al cliente (cancelación). */
export async function refundForJob(jobId: string): Promise<void> {
  const payment = await db.payment.findUnique({ where: { jobId } });
  if (!payment || !["PENDING", "HELD"].includes(payment.status)) return;

  // Con proveedor real, pide el reembolso; el simulado no mueve dinero.
  if (payment.providerRef) {
    const provider = getPaymentProvider();
    try {
      await provider.refund(payment.providerRef);
    } catch {
      /* el reembolso puede reintentarse; igual marcamos el estado */
    }
  }

  await db.payment.update({
    where: { jobId },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });
}
