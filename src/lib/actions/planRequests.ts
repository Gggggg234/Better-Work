"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { sendPlanApprovedEmail, sendPlanRejectedEmail } from "@/lib/mail";

const DAY = 86_400_000;

/** Renovar el mismo plan suma días; cambiar de plan reinicia el período. */
function nextExpiry(current: Date | null, samePlan: boolean, days: number): Date {
  const base = samePlan && current && current > new Date() ? current : new Date();
  return new Date(base.getTime() + days * DAY);
}

/**
 * El Super Admin aprueba el comprobante: recién acá se activa la membresía y
 * se calcula el vencimiento. Queda registrada en Promotion para la contabilidad.
 */
export async function approvePlanRequest(requestId: string): Promise<void> {
  await requireRole("ADMIN");

  const req = await db.planRequest.findUnique({
    where: { id: requestId },
    include: { company: { include: { user: { select: { id: true, email: true } } } } },
  });
  // Sólo se procesa una vez: si ya se revisó, no se vuelve a aplicar.
  if (!req || req.status !== "PENDING") return;

  const plan = await db.plan.findUnique({ where: { key: req.planKey } });
  if (!plan) return;

  const company = req.company;
  const until = nextExpiry(company.planActiveUntil, company.planKey === req.planKey, req.days);

  await db.$transaction([
    db.planRequest.update({
      where: { id: req.id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
    db.companyProfile.update({
      where: { id: company.id },
      data: {
        planKey: plan.key,
        planActiveUntil: until,
        // La insignia verificada es un beneficio del plan.
        verified: plan.verifiedBadge ? true : company.verified,
      },
    }),
    db.promotion.create({
      data: {
        userId: company.user.id,
        kind: "COMPANY_PLAN",
        refId: plan.key,
        days: req.days,
        amount: req.amount,
      },
    }),
  ]);

  // El aviso es best-effort: si el email falla, la membresía igual quedó activa.
  await sendPlanApprovedEmail(company.user.email, plan.name, until).catch(() => {});

  revalidatePath("/admin", "layout");
  revalidatePath("/company");
  revalidatePath("/app");
}

/** Rechaza el comprobante. La empresa puede volver a enviarlo. */
export async function rejectPlanRequest(requestId: string, formData: FormData): Promise<void> {
  await requireRole("ADMIN");

  const reason = String(formData.get("note") ?? "").trim().slice(0, 300);

  const req = await db.planRequest.findUnique({
    where: { id: requestId },
    include: { company: { include: { user: { select: { email: true } } } } },
  });
  if (!req || req.status !== "PENDING") return;

  await db.planRequest.update({
    where: { id: req.id },
    data: { status: "REJECTED", reviewedAt: new Date(), note: reason },
  });

  await sendPlanRejectedEmail(req.company.user.email, reason).catch(() => {});

  revalidatePath("/admin", "layout");
  revalidatePath("/company");
}
