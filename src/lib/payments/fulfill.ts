import { db } from "@/lib/db";
import { getCommissionPct, computeCommission } from "@/lib/commission";
import type { ChargeSubject } from "./types";

/**
 * Aplica el efecto de un cobro aprobado. Lo usan tanto el proveedor simulado
 * (que cobra en el momento) como el webhook de Mercado Pago (que confirma
 * después). Es idempotente: si el pago ya fue aplicado, no duplica nada.
 */

function extend(current: Date | null | undefined, days: number): Date {
  const base = current && current > new Date() ? current : new Date();
  return new Date(base.getTime() + days * 86_400_000);
}

/** ¿Ya registramos este cobro? Evita duplicados si el webhook reintenta. */
async function alreadyApplied(providerRef: string): Promise<boolean> {
  const [payment, promo] = await Promise.all([
    db.payment.findFirst({ where: { providerRef }, select: { id: true } }),
    db.promotion.findFirst({ where: { providerRef }, select: { id: true } }),
  ]);
  return Boolean(payment || promo);
}

export async function fulfillCharge(
  subject: ChargeSubject,
  providerRef: string,
  payerId: string,
  amount: number
): Promise<void> {
  if (providerRef && (await alreadyApplied(providerRef))) return;

  if (subject.type === "JOB") {
    const job = await db.job.findUnique({ where: { id: subject.jobId }, include: { payment: true } });
    if (!job || job.payment) return; // inexistente o ya pagado
    const pct = await getCommissionPct();
    const b = computeCommission(job.price ?? amount, pct);
    await db.payment.create({
      data: {
        jobId: job.id,
        amount: b.amount,
        commission: b.commission,
        netAmount: b.net,
        method: "MERCADOPAGO",
        providerRef,
        status: "HELD",
      },
    });
    return;
  }

  if (subject.type === "COMPANY_PLAN") {
    const profile = await db.companyProfile.findUnique({ where: { id: subject.companyProfileId } });
    if (!profile) return;
    await db.$transaction([
      db.companyProfile.update({
        where: { id: profile.id },
        data: { planActiveUntil: extend(profile.planActiveUntil, subject.days) },
      }),
      db.promotion.create({
        data: {
          userId: profile.userId,
          kind: "COMPANY_PLAN",
          refId: profile.id,
          days: subject.days,
          amount,
          providerRef,
        },
      }),
    ]);
    return;
  }

  // PROMO: perfil (trabajador o empresa), oferta o publicación.
  const { kind, refId, days } = subject;
  if (kind === "PROFILE") {
    const worker = await db.workerProfile.findUnique({ where: { id: refId } });
    if (worker) {
      await db.workerProfile.update({
        where: { id: refId },
        data: { sponsoredUntil: extend(worker.sponsoredUntil, days) },
      });
    } else {
      const company = await db.companyProfile.findUnique({ where: { id: refId } });
      if (!company) return;
      await db.companyProfile.update({
        where: { id: refId },
        data: { sponsoredUntil: extend(company.sponsoredUntil, days) },
      });
    }
  } else if (kind === "OFFER") {
    const offer = await db.jobOffer.findUnique({ where: { id: refId } });
    if (!offer) return;
    await db.jobOffer.update({
      where: { id: refId },
      data: { promotedUntil: extend(offer.promotedUntil, days) },
    });
  } else {
    const post = await db.post.findUnique({ where: { id: refId } });
    if (!post) return;
    await db.post.update({
      where: { id: refId },
      data: { sponsoredUntil: extend(post.sponsoredUntil, days) },
    });
  }

  await db.promotion.create({
    data: { userId: payerId, kind, refId, days, amount, providerRef },
  });
}
