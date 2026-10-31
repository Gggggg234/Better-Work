import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, timeAgo, toneBadge } from "@/lib/format";
import { ORDER_STATUS, OPEN_ORDER_STATUSES, orderNumber, parseItems } from "@/lib/supplies";
import { MaterialsHeader } from "@/components/supplies/MaterialsHeader";
import { SupplierLogo } from "@/components/supplies/Cards";

export default async function MyOrdersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const orders = await db.supplyOrder.findMany({
    where: { buyerId: me.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { supplier: { select: { businessName: true, logoUrl: true } } },
  });
  const open = orders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status));
  const past = orders.filter((o) => !OPEN_ORDER_STATUSES.includes(o.status));

  const Row = ({ o }: { o: (typeof orders)[number] }) => {
    const items = parseItems(o.items);
    const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.PENDING;
    return (
      <Link href={`/materiales/pedidos/${o.id}`} className="card p-4 flex items-center gap-3.5 hover:border-fg/20 transition">
        <SupplierLogo name={o.supplier.businessName} url={o.supplier.logoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{o.supplier.businessName}</p>
          <p className="text-xs text-muted">
            #{orderNumber(o.id)} · {items.length} {items.length === 1 ? "producto" : "productos"} · {timeAgo(o.createdAt)}
          </p>
          <span className={`${toneBadge(st.tone)} mt-1.5`}>{st.label}</span>
        </div>
        <p className="font-bold text-sm shrink-0">{formatMoney(o.total ?? o.subtotal)}</p>
      </Link>
    );
  };

  return (
    <main className="max-w-2xl mx-auto w-full px-4 py-5 space-y-6 animate-fade-up">
      <MaterialsHeader tab="pedidos" title="Mis pedidos" subtitle="Seguí tus compras de materiales." />

      {orders.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="icon-tile w-14 h-14 bg-surface-2 text-muted mx-auto">
            <Receipt className="w-7 h-7" aria-hidden />
          </span>
          <p className="font-semibold mt-4">Todavía no hiciste pedidos</p>
          <p className="text-sm text-muted mt-1">Cuando le pidas materiales a un proveedor, lo vas a seguir desde acá.</p>
          <Link href="/materiales" className="btn-primary mt-4 inline-flex">Ver materiales</Link>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-sm font-semibold text-muted">En curso</h2>
              {open.map((o) => <Row key={o.id} o={o} />)}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-sm font-semibold text-muted">Historial</h2>
              {past.map((o) => <Row key={o.id} o={o} />)}
            </section>
          )}
        </>
      )}
    </main>
  );
}
