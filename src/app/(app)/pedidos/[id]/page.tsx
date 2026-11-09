import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFeeConfig } from "@/lib/settings";
import { computeRank } from "@/lib/rank";
import { formatMoney, formatDateTime, timeAgo } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { priceBreakdown } from "@/lib/payments/escrow";
import { escrowActive } from "@/lib/payments";
import { isPro, getProConfig, bidsThisMonth } from "@/lib/pro";
import { isOpen, requestStatusLabel, withinReach, BID_STATUS_LABEL, MAX_BIDS } from "@/lib/openRequests";
import { acceptBid, cancelOpenRequest, withdrawBid } from "@/lib/actions/openRequests";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/Stars";
import { BackButton } from "@/components/BackButton";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { Attachments, parseAttachments } from "@/components/jobs/Attachments";
import { BidForm } from "@/components/openRequests/BidForm";

const ERRORS: Record<string, string> = {
  cerrado: "Este pedido ya no recibe presupuestos.",
  lleno: `Este pedido ya tiene ${MAX_BIDS} presupuestos, el máximo.`,
  precio: "Poné un precio válido.",
  limite: "Llegaste al límite de presupuestos gratis de este mes.",
};

export default async function OpenRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string; ok?: string; error?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;

  const [req, fees, escrow] = await Promise.all([
    db.openRequest.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, icon: true } },
        client: { select: { name: true } },
        bids: {
          orderBy: { price: "asc" },
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                workerProfile: {
                  select: {
                    ratingAvg: true,
                    ratingCount: true,
                    jobsDone: true,
                    verified: true,
                    createdAt: true,
                    cancellations: true,
                    claims: true,
                    avgResponseMins: true,
                    punctualityAvg: true,
                    proUntil: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    getFeeConfig(),
    escrowActive(),
  ]);
  if (!req) notFound();

  const isOwner = req.clientId === me.id;
  const myBid = req.bids.find((b) => b.workerId === me.id) ?? null;

  // Un profesional ve el pedido si ya cotizó, o si es de su oficio y le queda cerca.
  let reach: { ok: boolean; km: number | null } = { ok: false, km: null };
  if (!isOwner && me.role === "WORKER" && me.workerProfile) {
    reach = withinReach(me.workerProfile, req);
    const canSee = myBid || (me.workerProfile.categoryId === req.categoryId && reach.ok);
    if (!canSee) notFound();
  } else if (!isOwner) {
    notFound();
  }

  const open = isOpen(req);

  // Tope mensual de presupuestos para profesionales sin Pro.
  const workerIsPro = isPro(me.workerProfile?.proUntil);
  const quota =
    !isOwner && !workerIsPro
      ? await Promise.all([getProConfig(), bidsThisMonth(me.id)]).then(([c, used]) => ({
          free: c.freeBids,
          left: Math.max(0, c.freeBids - used),
        }))
      : null;
  const attachments = parseAttachments(req.attachments);
  const pendingBids = req.bids.filter((b) => b.status === "PENDING");
  const cheapest = pendingBids[0]?.price;

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 space-y-5 animate-fade-up">
      <BackButton fallback="/pedidos" />

      {sp.creado === "1" && isOwner && (
        <div className="card p-4 bg-fg text-bg">
          <p className="text-sm font-medium">✓ ¡Pedido publicado!</p>
          <p className="text-xs text-bg/70 mt-0.5">
            Los profesionales de {req.category.name.toLowerCase()} de tu zona ya lo pueden ver. Los presupuestos van a
            ir apareciendo acá.
          </p>
        </div>
      )}
      {sp.ok === "cotizacion" && myBid && (
        <div className="card p-4 bg-fg text-bg">
          <p className="text-sm font-medium">✓ Presupuesto enviado</p>
          <p className="text-xs text-bg/70 mt-0.5">Si el cliente te elige, te avisamos y el trabajo aparece en tus trabajos.</p>
        </div>
      )}
      {sp.error && ERRORS[sp.error] && (
        <div className="card p-4 border-danger/30" role="alert">
          <p className="text-sm text-danger">⚠ {ERRORS[sp.error]}</p>
        </div>
      )}

      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          {req.urgent && (
            <span className="rounded-full bg-fg text-bg px-2.5 py-0.5 text-[11px] font-semibold">Urgente</span>
          )}
          <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] text-muted">
            <span className="grayscale">{req.category.icon}</span> {req.category.name}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] text-muted">{requestStatusLabel(req)}</span>
        </div>
        <h1 className="text-xl font-bold">{req.title}</h1>
        <p className="text-sm text-muted">
          {isOwner ? "Publicado" : `Pedido de ${req.client.name.split(/\s+/)[0]}`} {timeAgo(req.createdAt)}
          {open && ` · cierra el ${formatDateTime(req.expiresAt)} hs`}
        </p>
      </div>

      {/* Detalle */}
      <div className="card divide-y divide-line">
        {req.description && <div className="p-4 text-sm text-muted whitespace-pre-line">{req.description}</div>}
        <div className="p-4 flex justify-between gap-3 text-sm">
          <span className="text-muted">Zona</span>
          <span className="font-medium text-right">
            {req.zone}
            {reach.km != null && <span className="text-faint font-normal"> · a {formatKm(reach.km)}</span>}
          </span>
        </div>
        {isOwner && (
          <div className="p-4 flex justify-between gap-3 text-sm">
            <span className="text-muted">Dirección</span>
            <span className="font-medium text-right">{req.address} <span className="text-faint"><span className="grayscale">🔒</span></span></span>
          </div>
        )}
        {req.scheduledFor && (
          <div className="p-4 flex justify-between gap-3 text-sm">
            <span className="text-muted">Cuándo</span>
            <span className="font-medium text-right">{formatDateTime(req.scheduledFor)} hs</span>
          </div>
        )}
      </div>

      <Attachments items={attachments} />

      {/* ===== Vista del cliente: comparar y elegir ===== */}
      {isOwner && (
        <>
          {req.status === "ASSIGNED" && req.jobId && (
            <Link href={`/jobs/${req.jobId}`} className="card p-4 flex items-center justify-between hover:bg-surface-2 transition">
              <div>
                <p className="font-semibold text-sm">Elegiste un profesional</p>
                <p className="text-xs text-muted">Seguí el trabajo y el pago desde acá.</p>
              </div>
              <span className="text-lg">→</span>
            </Link>
          )}

          <section className="space-y-2.5">
            <h2 className="font-semibold">
              Presupuestos{" "}
              <span className="text-faint font-normal">
                ({pendingBids.length}
                {open ? ` de ${MAX_BIDS}` : ""})
              </span>
            </h2>

            {req.bids.length === 0 && (
              <div className="card p-6 text-center">
                <p className="text-sm text-muted">
                  {open
                    ? "Todavía no llegaron presupuestos. Cuando un profesional cotice, aparece acá."
                    : "Este pedido cerró sin presupuestos."}
                </p>
                {!open && (
                  <Link href="/pedidos/nuevo" className="btn-secondary !py-2 !text-sm mt-3 inline-flex">
                    Publicar otro pedido
                  </Link>
                )}
              </div>
            )}

            {req.bids
              .filter((b) => b.status !== "WITHDRAWN")
              .map((b) => {
                const wp = b.worker.workerProfile;
                const bd = priceBreakdown(b.price, { ...fees, urgencyPct: req.urgencyPct });
                // Con pago directo se le paga al profesional; con protegido, más la tarifa.
                const total = escrow ? bd.clientTotal : bd.workAmount;
                const rank = wp ? computeRank(wp) : null;
                return (
                  <article
                    key={b.id}
                    className={`card p-4 ${b.status === "ACCEPTED" ? "border-fg" : ""} ${b.status === "REJECTED" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={b.worker.name} url={b.worker.avatarUrl} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link href={`/w/${b.worker.id}`} className="font-semibold text-sm hover:underline">
                            {b.worker.name}
                          </Link>
                          {wp?.verified && (
                            <span className="rounded-full bg-fg text-bg px-1.5 py-px text-[10px] font-semibold">✓</span>
                          )}
                          {isPro(wp?.proUntil) && (
                            <span className="rounded-full border border-fg px-1.5 py-px text-[10px] font-bold">PRO</span>
                          )}
                          {b.status === "PENDING" && b.price === cheapest && pendingBids.length > 1 && (
                            <span className="rounded-full border border-fg px-1.5 py-px text-[10px] font-semibold">
                              Más económico
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-faint mt-0.5">
                          {wp && wp.ratingCount > 0 ? (
                            <>
                              <Stars value={wp.ratingAvg} size="text-xs" /> {wp.ratingAvg.toFixed(1)} ({wp.ratingCount}) ·{" "}
                            </>
                          ) : null}
                          {wp ? `${wp.jobsDone} ${wp.jobsDone === 1 ? "trabajo" : "trabajos"}` : ""}
                          {rank && ` · ${rank}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold">{formatMoney(b.price)}</p>
                        {b.estimatedTime && <p className="text-[11px] text-muted">{b.estimatedTime}</p>}
                      </div>
                    </div>

                    {b.note && <p className="text-sm text-muted mt-3 whitespace-pre-line">{b.note}</p>}

                    {b.status === "PENDING" && open ? (
                      <form action={acceptBid.bind(null, req.id, b.id)} className="mt-3">
                        <FormSubmitButton pendingLabel="Eligiendo…" className="!py-2.5 !text-sm">
                          Elegir · {escrow ? "pagás" : "total"} {formatMoney(total)}
                        </FormSubmitButton>
                      </form>
                    ) : (
                      <p className="text-xs text-faint mt-3">{BID_STATUS_LABEL[b.status]}</p>
                    )}
                  </article>
                );
              })}

            {pendingBids.length > 0 && open && (
              <p className="text-[11px] text-faint">
                {escrow
                  ? `El total incluye ${req.urgent ? `el ${req.urgencyPct}% de urgencia y ` : ""}la tarifa de servicio del ${fees.serviceFeePct}%. Pagás después de elegir, y el dinero queda retenido hasta que el trabajo esté terminado.`
                  : `${req.urgent ? `El total incluye el ${req.urgencyPct}% de urgencia. ` : ""}Le pagás directo al profesional que elijas, al terminar, en efectivo o por transferencia.`}
              </p>
            )}
          </section>

          {open && (
            <form action={cancelOpenRequest.bind(null, req.id)} className="text-center">
              <button className="btn-ghost !text-sm text-danger">Cerrar pedido sin elegir</button>
            </form>
          )}
        </>
      )}

      {/* ===== Vista del profesional: cotizar ===== */}
      {!isOwner && (
        <>
          {myBid?.status === "ACCEPTED" && req.jobId ? (
            <Link href={`/jobs/${req.jobId}`} className="card p-4 bg-fg text-bg flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">¡Te eligieron!</p>
                <p className="text-xs text-bg/70">
                  {escrow ? "Cuando el cliente pague, podés arrancar el trabajo." : "Coordiná con el cliente y arrancá el trabajo."}
                </p>
              </div>
              <span className="text-lg">→</span>
            </Link>
          ) : open && (!myBid || ["PENDING", "WITHDRAWN"].includes(myBid.status)) ? (
            <>
              <p className="text-xs text-muted">
                {pendingBids.length === 0
                  ? "Todavía nadie cotizó: sé el primero."
                  : `${pendingBids.length} ${pendingBids.length === 1 ? "profesional ya cotizó" : "profesionales ya cotizaron"}.`}
                {" "}La dirección exacta la ves si te eligen.
              </p>
              {/* Sin Pro: tope mensual de presupuestos nuevos (actualizar el propio no cuenta). */}
              {quota && !myBid && quota.left === 0 ? (
                <div className="card p-5 text-center">
                  <p className="text-sm font-medium">
                    {quota.free === 1
                      ? "Usaste tu presupuesto gratis de este mes"
                      : `Usaste tus ${quota.free} presupuestos gratis de este mes`}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Con Manobra Pro mandás presupuestos sin límite y aparecés más arriba en las búsquedas.
                  </p>
                  <Link href="/pro" className="btn-primary !py-2.5 !text-sm mt-3 inline-flex">Pasate a Pro</Link>
                </div>
              ) : (
                <>
                  {quota && !myBid && (
                    <p className="text-[11px] text-faint">
                      Te {quota.left === 1 ? "queda" : "quedan"} {quota.left} de {quota.free} presupuestos gratis este
                      mes. <Link href="/pro" className="underline">Con Pro son ilimitados</Link>.
                    </p>
                  )}
                  <BidForm
                    requestId={req.id}
                    current={myBid?.status === "PENDING" ? myBid : null}
                    urgencyPct={req.urgencyPct}
                    commissionPct={fees.commissionPct}
                    escrow={escrow}
                  />
                </>
              )}
              {myBid?.status === "PENDING" && (
                <form action={withdrawBid.bind(null, req.id)} className="text-center">
                  <button className="btn-ghost !text-sm text-danger">Retirar mi presupuesto</button>
                </form>
              )}
            </>
          ) : (
            <div className="card p-4">
              <p className="text-sm font-medium">
                {myBid ? `Tu presupuesto: ${formatMoney(myBid.price)} · ${BID_STATUS_LABEL[myBid.status]}` : "Este pedido ya no recibe presupuestos."}
              </p>
              {myBid?.status === "REJECTED" && (
                <p className="text-xs text-muted mt-0.5">El cliente eligió otro presupuesto. ¡Seguí cotizando!</p>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
