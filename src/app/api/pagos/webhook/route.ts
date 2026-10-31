import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { giveBackFreeJob } from "@/lib/referrals";
import { getMpPayment } from "@/lib/payments/mercadopago";
import { handlePaymentNotice, handleSubscriptionNotice } from "@/lib/billing";

/**
 * Webhook de Mercado Pago.
 *
 * MP avisa que hubo movimiento en un pago; nunca confiamos en el cuerpo:
 * re-consultamos el pago con la API, y si está aprobado marcamos el escrow del
 * trabajo como HELD (el `external_reference` es el jobId).
 *
 * También recibe los cobros de la plataforma (Pro, planes, billetera) y los
 * avisos de suscripciones: esos los resuelve `lib/billing`.
 *
 * Siempre respondemos 200: si devolviéramos error, Mercado Pago reintenta en
 * bucle. Los casos que no aplican simplemente se ignoran.
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    // MP manda el id por query (?data.id=) o en el body, según el evento.
    let paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
    const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

    let bodyType: string | undefined;
    if (!paymentId) {
      const body = (await request.json().catch(() => null)) as
        | { data?: { id?: string | number }; type?: string }
        | null;
      paymentId = body?.data?.id != null ? String(body.data.id) : null;
      bodyType = body?.type;
    }
    const kind = type ?? bodyType ?? "payment";
    if (!paymentId) return NextResponse.json({ ok: true });

    // Suscripciones de la plataforma (débito automático).
    if (kind.startsWith("subscription_")) {
      await handleSubscriptionNotice(kind, paymentId);
      return NextResponse.json({ ok: true });
    }
    // Sólo nos interesan las notificaciones de pagos.
    if (kind !== "payment") return NextResponse.json({ ok: true });

    // ¿Es un cobro de la plataforma (Pro, plan, billetera, débito de suscripción)?
    if (await handlePaymentNotice(paymentId)) return NextResponse.json({ ok: true });

    const info = await getMpPayment(paymentId);
    if (!info || !info.jobId) return NextResponse.json({ ok: true });

    const payment = await db.payment.findUnique({ where: { jobId: info.jobId } });
    if (!payment) return NextResponse.json({ ok: true });

    if (info.status === "approved" && payment.status === "PENDING") {
      await db.payment.update({
        where: { jobId: info.jobId },
        data: { status: "HELD", heldAt: new Date(), providerRef: info.paymentId },
      });
    } else if (info.status === "rejected" && payment.status === "PENDING") {
      // Pago rechazado: se descarta para que el cliente pueda reintentar. Si
      // usaba una bonificación por referidos, se le devuelve (una sola vez:
      // MP puede reenviar la misma notificación).
      const removed = await db.payment.deleteMany({ where: { jobId: info.jobId, status: "PENDING" } });
      if (removed.count === 1 && payment.feeWaived) {
        const job = await db.job.findUnique({ where: { id: info.jobId }, select: { clientId: true } });
        if (job) await giveBackFreeJob(job.clientId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Nunca fallar: MP reintentaría en bucle.
    return NextResponse.json({ ok: true });
  }
}

// MP a veces hace un GET de verificación al configurar la URL.
export async function GET() {
  return NextResponse.json({ ok: true });
}
