import Link from "next/link";
import { redirect } from "next/navigation";
import { Truck, Store } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, timeAgo, toneBadge } from "@/lib/format";
import { ORDER_STATUS, orderNumber, parseItems } from "@/lib/supplies";

const TABS = {
  nuevos: { label: "Nuevos", statuses: ["PENDING"] },
  curso: { label: "En curso", statuses: ["CONFIRMED", "READY", "SHIPPED"] },
  finalizados: { label: "Finalizados", statuses: ["DELIVERED", "CANCELLED", "REJECTED"] },
} as const;

export default async function SupplierOrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await getCurrentUser();
  if (!me?.supplierProfile) redirect("/proveedor");
  const sp = await searchParams;
  const tab = (sp.tab && sp.tab in TABS ? sp.tab : "nuevos") as keyof typeof TABS;

  const [orders, counts] = await Promise.all([
    db.supplyOrder.findMany({
      where: { supplierId: me.supplierProfile.id, status: { in: [...TABS[tab].statuses] } },
      orderBy: { createdAt: tab === "nuevos" ? "asc" : "desc" },
      take: 100,
      include: { buyer: { select: { name: true } } },
    }),
    db.supplyOrder.groupBy({ by: ["status"], where: { supplierId: me.supplierProfile.id }, _count: true }),
  ]);
  const countOf = (k: keyof typeof TABS) =>
    counts.filter((c) => (TABS[k].statuses as readonly string[]).includes(c.status)).reduce((s, c) => s + c._count, 0);

  return (
    <main className="max-w-3xl mx-auto w-full px-4 py-5 space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-sm text-muted mt-0.5">Confirmá stock y total, prepará y entregá.</p>
      </div>

      <nav className="flex gap-1 p-1 rounded-xl bg-surface-2 w-fit" aria-label="Estados de pedidos">
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => {
          const n = countOf(k);
          return (
            <Link
              key={k}
              href={`/proveedor/pedidos?tab=${k}`}
              aria-current={tab === k ? "page" : undefined}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition inline-flex items-center gap-1.5 ${
                tab === k ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              {TABS[k].label}
              {n > 0 && k !== "finalizados" && (
                <span className={`min-w-5 h-5 px-1 rounded-full text-[11px] font-bold leading-5 text-center ${k === "nuevos" ? "bg-fg text-bg" : "bg-accent/15 text-accent"}`}>
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2.5">
        {orders.map((o) => {
          const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.PENDING;
          const items = parseItems(o.items);
          return (
            <Link key={o.id} href={`/proveedor/pedidos/${o.id}`} className="card p-4 block hover:border-fg/20 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">
                    #{orderNumber(o.id)} · {o.buyer.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    {o.delivery === "DELIVERY" ? <Truck className="w-3.5 h-3.5" aria-hidden /> : <Store className="w-3.5 h-3.5" aria-hidden />}
                    {o.delivery === "DELIVERY" ? "Envío" : "Retiro"} · {timeAgo(o.createdAt)}
                    {o.payMethod && ` · ${o.payMethod}`}
                  </p>
                </div>
                <p className="font-bold text-sm shrink-0">{formatMoney(o.total ?? o.subtotal)}</p>
              </div>
              <p className="text-xs text-muted mt-2 line-clamp-2">
                {items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
              </p>
              <span className={`${toneBadge(st.tone)} mt-2`}>{st.label}</span>
            </Link>
          );
        })}
        {orders.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">
            {tab === "nuevos" ? "No tenés pedidos nuevos. Te avisamos con una notificación cuando llegue uno." : "No hay pedidos acá."}
          </div>
        )}
      </div>
    </main>
  );
}
