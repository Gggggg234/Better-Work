import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/payments/mercadopago";
import { decodeSubject } from "@/lib/payments";
import { fulfillCharge } from "@/lib/payments/fulfill";
import { db } from "@/lib/db";

/**
 * Webhook de Mercado Pago: la fuente de verdad de los cobros.
 *
 * MP avisa que un pago cambió de estado; nosotros consultamos el pago contra
 * su API (nunca confiamos en el body) y, si está aprobado, aplicamos el efecto.
 * Es idempotente: MP reintenta y puede avisar varias veces.
 */
export async function POST(req: NextRequest) {
  let paymentId: string | null = null;

  // MP manda el id por body o por query, según la versión del aviso.
  try {
    const body = (await req.json()) as { type?: string; action?: string; data?: { id?: string | number } };
    if (body?.data?.id && (body.type === "payment" || body.action?.startsWith("payment"))) {
      paymentId = String(body.data.id);
    }
  } catch {
    /* sin body JSON */
  }
  if (!paymentId) {
    const sp = req.nextUrl.searchParams;
    if (sp.get("topic") === "payment" || sp.get("type") === "payment") {
      paymentId = sp.get("id") ?? sp.get("data.id");
    }
  }

  // Siempre 200: si no es un aviso de pago, MP no debe reintentar.
  if (!paymentId) return NextResponse.json({ ok: true, ignored: true });

  const payment = await getMercadoPagoPayment(paymentId);
  if (!payment) return NextResponse.json({ ok: true, unknown: true });

  const subject = decodeSubject(payment.externalReference);
  if (!subject) return NextResponse.json({ ok: true, unmatched: true });

  if (payment.status === "approved") {
    // El pagador se deduce del recurso; para el registro de compras usamos su dueño.
    const payerId = await resolvePayerId(subject);
    await fulfillCharge(subject, paymentId, payerId, payment.amount);
  }

  return NextResponse.json({ ok: true });
}

/** Dueño del recurso que se está pagando (para asentar la compra). */
async function resolvePayerId(subject: ReturnType<typeof decodeSubject>): Promise<string> {
  if (!subject) return "";
  if (subject.type === "JOB") {
    const job = await db.job.findUnique({ where: { id: subject.jobId }, select: { clientId: true } });
    return job?.clientId ?? "";
  }
  if (subject.type === "COMPANY_PLAN") {
    const c = await db.companyProfile.findUnique({ where: { id: subject.companyProfileId }, select: { userId: true } });
    return c?.userId ?? "";
  }
  if (subject.kind === "PROFILE") {
    const w = await db.workerProfile.findUnique({ where: { id: subject.refId }, select: { userId: true } });
    if (w) return w.userId;
    const c = await db.companyProfile.findUnique({ where: { id: subject.refId }, select: { userId: true } });
    return c?.userId ?? "";
  }
  if (subject.kind === "OFFER") {
    const o = await db.jobOffer.findUnique({
      where: { id: subject.refId },
      select: { company: { select: { userId: true } } },
    });
    return o?.company.userId ?? "";
  }
  const p = await db.post.findUnique({ where: { id: subject.refId }, select: { authorId: true } });
  return p?.authorId ?? "";
}

// MP también hace GET para validar la URL.
export async function GET() {
  return NextResponse.json({ ok: true });
}
