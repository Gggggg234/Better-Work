"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPaymentProvider, escrowActive } from "@/lib/payments";
import { splitAmount, priceBreakdown } from "@/lib/payments/escrow";
import { getCommissionPct, getFeeConfig } from "@/lib/settings";
import { takeFreeJob, giveBackFreeJob } from "@/lib/referrals";

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
  // Con pago directo no se cobra nada por la app.
  if (!(await escrowActive())) redirect(`/jobs/${jobId}`);
  if (!job.price || job.price <= 0) redirect(`/jobs/${jobId}?pago=sinprecio`);
  // Se paga tras aceptar y antes de empezar; si ya está retenido, no se repite.
  if (!["ACCEPTED", "EN_ROUTE"].includes(job.status)) redirect(`/jobs/${jobId}?pago=estado`);
  if (job.payment && ["HELD", "RELEASED"].includes(job.payment.status)) redirect(`/jobs/${jobId}`);

  const provider = getPaymentProvider();

  // El cliente paga el trabajo (presupuesto + urgencia) más la tarifa de servicio.
  const fees = await getFeeConfig();
  const b = priceBreakdown(job.price, { ...fees, urgencyPct: job.urgencyPct });

  // Trabajo bonificado por referidos: sin tarifa de servicio. Un reintento de
  // pago reusa la bonificación que ya tenía, sin gastar otra.
  const feeWaived =
    b.serviceFee > 0 && (job.payment?.feeWaived === true || (await takeFreeJob(user.id)));
  const serviceFee = feeWaived ? 0 : b.serviceFee;

  let result;
  try {
    result = await provider.createCheckout({
      jobId: job.id,
      amount: b.workAmount + serviceFee,
      title: `Manobra — ${job.title}${job.urgent ? " (urgente)" : ""}`,
      payerEmail: user.email,
    });
  } catch {
    // No se cobró: si recién se usó una bonificación, se devuelve.
    if (feeWaived && !job.payment?.feeWaived) await giveBackFreeJob(user.id);
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
      amount: b.workAmount,
      serviceFee,
      feeWaived,
      method: provider.id,
      providerRef: result.providerRef,
      status: held ? "HELD" : "PENDING",
      heldAt: held ? new Date() : null,
    },
    update: {
      amount: b.workAmount,
      serviceFee,
      feeWaived,
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
  const payment = await db.payment.findUnique({ where: { jobId }, include: { job: { select: { workerId: true } } } });
  if (!payment || payment.status !== "HELD") return;

  const pct = await getCommissionPct();
  const { commission } = splitAmount(payment.amount, pct);
  // Trabajo bonificado por referidos: el profesional cobra sin comisión.
  const commissionWaived = commission > 0 && (await takeFreeJob(payment.job.workerId));

  await db.payment.update({
    where: { jobId },
    data: { status: "RELEASED", releasedAt: new Date(), commission: commissionWaived ? 0 : commission, commissionWaived },
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

  const refunded = await db.payment.updateMany({
    where: { jobId, status: { in: ["PENDING", "HELD"] } },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });
  // Se canceló: la bonificación de la tarifa vuelve a estar disponible.
  if (refunded.count === 1 && payment.feeWaived) {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { clientId: true } });
    if (job) await giveBackFreeJob(job.clientId);
  }
}
