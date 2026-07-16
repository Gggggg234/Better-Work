import { NextRequest, NextResponse } from "next/server";
import { decodeSubject } from "@/lib/payments";
import { getMercadoPagoPayment } from "@/lib/payments/mercadopago";
import { fulfillCharge } from "@/lib/payments/fulfill";
import { db } from "@/lib/db";
import type { ChargeSubject } from "@/lib/payments";

/**
 * Vuelta del checkout de Mercado Pago. El webhook es la fuente de verdad, pero
 * acá confirmamos también (idempotente) para que el usuario vea el resultado al
 * instante en vez de esperar el aviso.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const externalReference = sp.get("external_reference") ?? "";
  const paymentId = sp.get("payment_id") ?? sp.get("collection_id");
  const status = sp.get("status") ?? sp.get("collection_status");

  const subject = decodeSubject(externalReference);
  const base = req.nextUrl.origin;

  if (!subject) return NextResponse.redirect(`${base}/app`);

  if (paymentId && status === "approved") {
    const payment = await getMercadoPagoPayment(paymentId);
    if (payment?.status === "approved") {
      await fulfillCharge(subject, paymentId, await ownerOf(subject), payment.amount);
    }
  }

  const ok = status === "approved";
  return NextResponse.redirect(`${base}${destinationFor(subject, ok)}`);
}

function destinationFor(subject: ChargeSubject, ok: boolean): string {
  if (subject.type === "JOB") return `/jobs/${subject.jobId}${ok ? "" : "?error=pago"}`;
  if (subject.type === "COMPANY_PLAN") return ok ? "/company?ok=plan" : "/company/plan?error=pago";
  if (subject.kind === "POST") return `/feed/${subject.refId}${ok ? "" : "?error=pago"}`;
  if (subject.kind === "OFFER") return ok ? "/company" : "/company?error=pago";
  return ok ? "/promote?ok=1" : "/promote?error=pago";
}

async function ownerOf(subject: ChargeSubject): Promise<string> {
  if (subject.type === "JOB") {
    const job = await db.job.findUnique({ where: { id: subject.jobId }, select: { clientId: true } });
    return job?.clientId ?? "";
  }
  if (subject.type === "COMPANY_PLAN") {
    const c = await db.companyProfile.findUnique({
      where: { id: subject.companyProfileId },
      select: { userId: true },
    });
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
