"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { genCode, formatMoney, parseLocalDateTime } from "@/lib/format";
import { isPlanActive } from "@/lib/plans";
import { getFeeConfig } from "@/lib/settings";
import { saveAttachment } from "@/lib/upload";
import { MAX_BIDS, expiryFrom, isOpen, withinReach } from "@/lib/openRequests";
import { isPro, getProConfig, bidsThisMonth } from "@/lib/pro";
import { sendNewOpenRequestEmail, sendNewBidEmail, sendBidAcceptedEmail, siteUrl } from "@/lib/mail";
import { notify } from "@/lib/notify";

/** Pedidos abiertos a la vez por cliente: evita el spam de pedidos. */
const MAX_OPEN_PER_CLIENT = 5;
/** A cuántos profesionales cercanos se les avisa por email de un pedido nuevo. */
const NOTIFY_LIMIT = 30;

/** El cliente publica un pedido para que lo coticen varios profesionales. */
export async function createOpenRequest(formData: FormData): Promise<void> {
  const user = await requireUser();

  // Igual que al contratar directo: una empresa necesita plan activo.
  if (user.role === "COMPANY") {
    const cp = await db.companyProfile.findUnique({ where: { userId: user.id } });
    if (!cp || !isPlanActive(cp.planActiveUntil)) redirect("/company/plan");
  }

  const now = new Date();
  const openCount = await db.openRequest.count({
    where: { clientId: user.id, status: "OPEN", expiresAt: { gt: now } },
  });
  if (openCount >= MAX_OPEN_PER_CLIENT) redirect("/pedidos?error=limite");

  const category = await db.category.findFirst({
    where: { id: String(formData.get("categoryId") ?? ""), active: true },
    select: { id: true, name: true },
  });
  if (!category) redirect("/pedidos/nuevo?error=categoria");

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const zone = String(formData.get("zone") ?? "").trim().slice(0, 80);
  const address = String(formData.get("address") ?? "").trim().slice(0, 200);
  if (!title || !zone || !address) redirect("/pedidos/nuevo?error=datos");

  const lat = parseFloat(String(formData.get("lat") ?? ""));
  const lng = parseFloat(String(formData.get("lng") ?? ""));

  let scheduledFor = parseLocalDateTime(String(formData.get("date") ?? ""), String(formData.get("time") ?? ""));

  const urgent = formData.get("urgent") === "on";
  const urgencyPct = urgent ? (await getFeeConfig()).urgencyPct : 0;
  // Urgente con un horario que ya pasó = lo antes posible.
  if (urgent && (!scheduledFor || scheduledFor < now)) scheduledFor = now;

  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  const saved = (await Promise.all(files.slice(0, 10).map((f) => saveAttachment(f)))).filter(
    (a): a is NonNullable<typeof a> => a != null
  );

  const req = await db.openRequest.create({
    data: {
      clientId: user.id,
      categoryId: category.id,
      title,
      description: String(formData.get("description") ?? "").trim().slice(0, 2000),
      zone,
      address,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      scheduledFor,
      urgent,
      urgencyPct,
      attachments: JSON.stringify(saved),
      expiresAt: expiryFrom(now, urgent),
    },
  });

  // Aviso por email a los profesionales del oficio que llegan a la zona. Va
  // después de responder: el cliente no espera a que salgan los emails.
  after(async () => {
    const workers = await db.workerProfile.findMany({
      where: { categoryId: category.id, visible: true, userId: { not: user.id }, user: { suspended: false } },
      select: { userId: true, lat: true, lng: true, radiusKm: true, user: { select: { email: true } } },
      take: 300,
    });
    const url = `${await siteUrl()}/pedidos/${req.id}`;
    const targets = workers.filter((w) => withinReach(w, req).ok).slice(0, NOTIFY_LIMIT);
    await notify(
      targets.map((w) => w.userId),
      {
        title: `${urgent ? "Urgente: n" : "N"}uevo pedido de ${category.name.toLowerCase()} cerca tuyo`,
        body: `${title} · ${zone}`,
        url: `/pedidos/${req.id}`,
      }
    );
    await Promise.allSettled(
      targets.map((w) =>
        sendNewOpenRequestEmail(w.user.email, { title, category: category.name, zone, urgent }, url)
      )
    );
  });

  revalidatePath("/pedidos");
  redirect(`/pedidos/${req.id}?creado=1`);
}

/** El profesional cotiza (o actualiza su cotización) un pedido abierto. */
export async function sendBid(requestId: string, formData: FormData): Promise<void> {
  const user = await requireRole("WORKER");
  const back = `/pedidos/${requestId}`;

  const [req, profile] = await Promise.all([
    db.openRequest.findUnique({
      where: { id: requestId },
      include: { client: { select: { email: true } } },
    }),
    db.workerProfile.findUnique({ where: { userId: user.id } }),
  ]);
  if (!req || !profile || req.clientId === user.id) redirect("/pedidos");
  if (!isOpen(req)) redirect(`${back}?error=cerrado`);
  if (req.categoryId !== profile.categoryId || !withinReach(profile, req).ok) redirect("/pedidos");

  const price = Math.round(parseFloat(String(formData.get("price") ?? "")) || 0);
  if (price <= 0) redirect(`${back}?error=precio`);
  const estimatedTime = String(formData.get("estimatedTime") ?? "").trim().slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  const existing = await db.bid.findUnique({ where: { requestId_workerId: { requestId, workerId: user.id } } });
  if (existing && !["PENDING", "WITHDRAWN"].includes(existing.status)) redirect(back);
  // Actualizar la propia no ocupa un lugar nuevo.
  if (!existing || existing.status !== "PENDING") {
    const pending = await db.bid.count({ where: { requestId, status: "PENDING" } });
    if (pending >= MAX_BIDS) redirect(`${back}?error=lleno`);
  }
  // Sin Pro hay un tope de presupuestos nuevos por mes (Pro: ilimitados).
  if (!existing && !isPro(profile.proUntil)) {
    const [{ freeBids }, used] = await Promise.all([getProConfig(), bidsThisMonth(user.id)]);
    if (used >= freeBids) redirect(`${back}?error=limite`);
  }

  await db.bid.upsert({
    where: { requestId_workerId: { requestId, workerId: user.id } },
    create: { requestId, workerId: user.id, price, estimatedTime, note },
    update: { price, estimatedTime, note, status: "PENDING", createdAt: new Date() },
  });

  after(async () => {
    await notify(req.clientId, {
      title: `Nuevo presupuesto: ${formatMoney(price)}`,
      body: `${user.name.split(/\s+/)[0]} cotizó «${req.title}»`,
      url: back,
    });
    await sendNewBidEmail(
      req.client.email,
      { workerName: user.name.split(/\s+/)[0], price: formatMoney(price), title: req.title },
      `${await siteUrl()}${back}`
    );
  });

  revalidatePath(back);
  revalidatePath("/pedidos");
  redirect(`${back}?ok=cotizacion`);
}

/** El profesional retira su cotización mientras el pedido sigue abierto. */
export async function withdrawBid(requestId: string): Promise<void> {
  const user = await requireRole("WORKER");
  await db.bid.updateMany({
    where: { requestId, workerId: user.id, status: "PENDING", request: { status: "OPEN" } },
    data: { status: "WITHDRAWN" },
  });
  revalidatePath(`/pedidos/${requestId}`);
}

/**
 * El cliente elige una cotización: se crea el trabajo con ese profesional y
 * ese precio (ACCEPTED, con sus códigos) y sigue el flujo normal de pago
 * protegido. Las demás cotizaciones quedan como no elegidas.
 */
export async function acceptBid(requestId: string, bidId: string): Promise<void> {
  const user = await requireUser();
  const back = `/pedidos/${requestId}`;

  const req = await db.openRequest.findUnique({ where: { id: requestId } });
  if (!req || req.clientId !== user.id) redirect("/pedidos");
  if (!isOpen(req)) redirect(`${back}?error=cerrado`);

  const bid = await db.bid.findUnique({ where: { id: bidId }, include: { worker: { select: { email: true } } } });
  if (!bid || bid.requestId !== requestId || bid.status !== "PENDING") redirect(back);

  const jobId = await db.$transaction(async (tx) => {
    // Cierra el pedido sólo si sigue abierto: evita elegir dos veces (doble clic).
    const closed = await tx.openRequest.updateMany({
      where: { id: requestId, status: "OPEN" },
      data: { status: "ASSIGNED" },
    });
    if (closed.count !== 1) return null;

    const job = await tx.job.create({
      data: {
        clientId: req.clientId,
        workerId: bid.workerId,
        title: req.title,
        description: req.description,
        address: [req.address, req.zone].filter(Boolean).join(", "),
        lat: req.lat,
        lng: req.lng,
        scheduledFor: req.scheduledFor,
        attachments: req.attachments,
        urgent: req.urgent,
        urgencyPct: req.urgencyPct,
        price: bid.price,
        status: "ACCEPTED",
        requestedAt: req.createdAt,
        acceptedAt: new Date(),
        startCode: genCode(),
        endCode: genCode(),
      },
    });
    await tx.openRequest.update({ where: { id: requestId }, data: { jobId: job.id } });
    await tx.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } });
    await tx.bid.updateMany({
      where: { requestId, status: "PENDING", id: { not: bid.id } },
      data: { status: "REJECTED" },
    });
    return job.id;
  });
  if (!jobId) redirect(back);

  after(async () => {
    await notify(bid.workerId, {
      title: "¡Te eligieron!",
      body: `${req.title}. Entrá para ver la dirección y coordinar.`,
      url: `/jobs/${jobId}`,
    });
    const others = await db.bid.findMany({
      where: { requestId, status: "REJECTED", id: { not: bid.id } },
      select: { workerId: true },
    });
    await notify(
      others.map((o) => o.workerId),
      { title: "El cliente eligió otro presupuesto", body: `${req.title}. ¡Seguí cotizando!`, url: back }
    );
    await sendBidAcceptedEmail(bid.worker.email, req.title, `${await siteUrl()}/jobs/${jobId}`);
  });

  revalidatePath("/pedidos");
  revalidatePath("/jobs");
  // Directo al trabajo: el próximo paso es pagar.
  redirect(`/jobs/${jobId}`);
}

/** El cliente cierra su pedido sin elegir a nadie. */
export async function cancelOpenRequest(requestId: string): Promise<void> {
  const user = await requireUser();
  const req = await db.openRequest.findUnique({ where: { id: requestId }, select: { clientId: true } });
  if (!req || req.clientId !== user.id) redirect("/pedidos");

  await db.$transaction([
    db.openRequest.updateMany({ where: { id: requestId, status: "OPEN" }, data: { status: "CANCELLED" } }),
    db.bid.updateMany({ where: { requestId, status: "PENDING" }, data: { status: "REJECTED" } }),
  ]);

  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${requestId}`);
}
