import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, timeAgo } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { openRequestsFor, requestStatusLabel, isOpen, BID_STATUS_LABEL } from "@/lib/openRequests";
import { mailConfigured } from "@/lib/mail";

const ERRORS: Record<string, string> = {
  limite: "Ya tenés 5 pedidos abiertos. Elegí un presupuesto o cerrá alguno antes de publicar otro.",
};

function UrgentBadge() {
  return (
    <span className="inline-block rounded-full bg-fg text-bg px-1.5 py-px text-[10px] font-semibold mr-1.5 align-middle">
      🚨 Urgente
    </span>
  );
}

export default async function OpenRequestsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const sp = await searchParams;

  const error = sp.error && ERRORS[sp.error] && (
    <div className="card p-4 mt-5 border-red-300" role="alert">
      <p className="text-sm text-red-600">⚠ {ERRORS[sp.error]}</p>
    </div>
  );

  // ── Profesional: pedidos de su oficio cerca + sus cotizaciones ──
  if (me.role === "WORKER" && me.workerProfile) {
    const wp = me.workerProfile;
    const [nearby, myBids] = await Promise.all([
      openRequestsFor(wp),
      db.bid.findMany({
        where: { workerId: me.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { request: { select: { id: true, title: true, zone: true, status: true, expiresAt: true } } },
      }),
    ]);

    return (
      <main className="max-w-lg mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold">Pedidos cerca tuyo</h1>
        <p className="text-sm text-muted mt-1">
          Clientes de tu zona buscando presupuesto. Cotizá y, si te eligen, el trabajo aparece en tus trabajos.
        </p>
        {error}

        {!wp.categoryId ? (
          <div className="card p-6 text-center mt-6">
            <p className="text-sm text-muted">Elegí tu oficio en tu perfil para ver los pedidos que te corresponden.</p>
            <Link href="/worker/profile" className="btn-secondary !py-2 !text-sm mt-3 inline-flex">Completar perfil</Link>
          </div>
        ) : (
          <div className="space-y-2.5 mt-6">
            {nearby.map((r) => (
              <Link key={r.id} href={`/pedidos/${r.id}`} className="card p-4 block hover:shadow-md transition">
                <p className="font-semibold text-sm">
                  {r.urgent && <UrgentBadge />}
                  {r.title}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {r.zone}
                  {r.reach.km != null && ` · a ${formatKm(r.reach.km)}`} · {timeAgo(r.createdAt)}
                </p>
                <p className="text-xs text-faint mt-1">
                  {r.myBid
                    ? `Tu presupuesto: ${formatMoney(r.myBid.price)} · ${BID_STATUS_LABEL[r.myBid.status]}`
                    : r._count.bids === 0
                      ? "Nadie cotizó todavía"
                      : `${r._count.bids} ${r._count.bids === 1 ? "presupuesto" : "presupuestos"}`}
                </p>
              </Link>
            ))}
            {nearby.length === 0 && (
              <div className="card p-6 text-center text-sm text-faint">
                No hay pedidos abiertos de tu oficio en tu zona ahora.
                {mailConfigured() && " Te avisamos por email cuando llegue uno."}
              </div>
            )}
          </div>
        )}

        {myBids.length > 0 && (
          <>
            <h2 className="font-semibold mt-8 mb-3 text-muted text-sm uppercase tracking-wide">Mis presupuestos</h2>
            <div className="space-y-2.5">
              {myBids.map((b) => (
                <Link
                  key={b.id}
                  href={`/pedidos/${b.request.id}`}
                  className="card p-4 flex items-center justify-between gap-3 hover:shadow-md transition"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{b.request.title}</p>
                    <p className="text-xs text-muted">{b.request.zone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatMoney(b.price)}</p>
                    <p className="text-[11px] text-faint">{BID_STATUS_LABEL[b.status]}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    );
  }

  // ── Cliente / empresa: sus pedidos ──
  const mine = await db.openRequest.findMany({
    where: { clientId: me.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      category: { select: { name: true, icon: true } },
      _count: { select: { bids: { where: { status: { in: ["PENDING", "ACCEPTED"] } } } } },
    },
  });

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mis pedidos</h1>
        <Link href="/pedidos/nuevo" className="btn-primary !py-2 !px-4 !text-sm">Nuevo pedido</Link>
      </div>
      <p className="text-sm text-muted mt-1">
        Publicá qué necesitás y compará los presupuestos de varios profesionales antes de elegir.
      </p>
      {error}

      <div className="space-y-2.5 mt-6">
        {mine.map((r) => (
          <Link key={r.id} href={`/pedidos/${r.id}`} className="card p-4 flex items-center justify-between gap-3 hover:shadow-md transition">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {r.urgent && isOpen(r) && <UrgentBadge />}
                {r.title}
              </p>
              <p className="text-xs text-muted">
                {r.category.icon} {r.category.name} · {timeAgo(r.createdAt)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">
                {r._count.bids} {r._count.bids === 1 ? "presupuesto" : "presupuestos"}
              </p>
              <p className="text-[11px] text-faint">{requestStatusLabel(r)}</p>
            </div>
          </Link>
        ))}
        {mine.length === 0 && (
          <div className="card p-6 text-center">
            <p className="text-2xl">📣</p>
            <p className="font-semibold mt-2">Pedí presupuestos a varios</p>
            <p className="text-sm text-muted mt-1">
              Contá qué necesitás y los profesionales de tu zona te cotizan. Comparás y elegís. Es gratis.
            </p>
            <Link href="/pedidos/nuevo" className="btn-primary !py-2.5 !text-sm mt-4 inline-flex">Publicar mi primer pedido</Link>
          </div>
        )}
      </div>
    </main>
  );
}
