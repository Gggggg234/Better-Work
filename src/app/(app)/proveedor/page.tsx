import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Store, Pencil, Bell, Circle, CheckCircle2, PackageX, TrendingUp, Boxes, ClipboardList } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, timeAgo, toneBadge } from "@/lib/format";
import { ORDER_STATUS, orderNumber, parseItems, parseList } from "@/lib/supplies";
import { SectionTitle } from "@/components/ui/ActionCards";

export default async function SupplierPanelPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const sp = await searchParams;

  const profile =
    me.supplierProfile ?? (await db.supplierProfile.create({ data: { userId: me.id, businessName: me.name } }));

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [pending, inProgress, sales, activeProducts, outOfStock, recent] = await Promise.all([
    db.supplyOrder.count({ where: { supplierId: profile.id, status: "PENDING" } }),
    db.supplyOrder.count({ where: { supplierId: profile.id, status: { in: ["CONFIRMED", "READY", "SHIPPED"] } } }),
    db.supplyOrder.findMany({
      where: { supplierId: profile.id, status: "DELIVERED", completedAt: { gte: monthStart } },
      select: { total: true, subtotal: true },
    }),
    db.product.count({ where: { supplierId: profile.id, active: true, hidden: false } }),
    db.product.count({ where: { supplierId: profile.id, active: true, stock: 0 } }),
    db.supplyOrder.findMany({
      where: { supplierId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { buyer: { select: { name: true } } },
    }),
  ]);
  const monthSales = sales.reduce((s, o) => s + (o.total ?? o.subtotal), 0);

  // Lo mínimo para que el comercio aparezca bien y le puedan comprar.
  const checklist = [
    { done: !!(profile.phone || profile.whatsapp), label: "Datos de contacto (teléfono o WhatsApp)", href: "/proveedor/perfil" },
    { done: !!profile.address && profile.lat != null, label: "Dirección y ubicación en el mapa", href: "/proveedor/perfil" },
    { done: parseList(profile.rubros).length > 0, label: "Rubros que vendés", href: "/proveedor/perfil" },
    { done: parseList(profile.payMethods).length > 0, label: "Formas de pago", href: "/proveedor/perfil" },
    { done: activeProducts > 0, label: "Tu primer producto publicado", href: "/proveedor/productos/nuevo" },
    { done: !!profile.logoUrl, label: "Logo o foto del comercio", href: "/proveedor/perfil" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  const stats = [
    { label: "Pedidos nuevos", value: String(pending), icon: Bell, tone: pending > 0 ? "text-warning" : "text-muted", href: "/proveedor/pedidos" },
    { label: "En preparación", value: String(inProgress), icon: ClipboardList, tone: "text-accent", href: "/proveedor/pedidos?tab=curso" },
    { label: "Ventas del mes", value: formatMoney(monthSales), icon: TrendingUp, tone: "text-success", href: "/proveedor/pedidos?tab=finalizados" },
    { label: "Productos activos", value: String(activeProducts), icon: Boxes, tone: "text-fg", href: "/proveedor/productos" },
  ];

  return (
    <main className="max-w-3xl mx-auto w-full px-4 py-5 space-y-6 animate-fade-up">
      <div>
        <p className="text-sm text-muted">Panel del proveedor</p>
        <h1 className="text-2xl font-bold tracking-tight">{profile.businessName}</h1>
      </div>

      {sp.ok === "perfil" && (
        <div className="card p-4 flex items-center gap-3 !border-success/40 bg-success/5">
          <CheckCircle2 className="w-5 h-5 text-success" aria-hidden />
          <p className="text-sm font-medium">Datos del comercio guardados.</p>
        </div>
      )}

      {doneCount < checklist.length && (
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Completá tu comercio</p>
              <p className="text-xs text-muted mt-0.5">Un comercio completo aparece mejor y vende más.</p>
            </div>
            <span className="text-sm font-bold">{doneCount}/{checklist.length}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2 mt-3 overflow-hidden">
            <div className="h-full bg-success rounded-full transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ul className="mt-4 space-y-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-2.5 text-sm hover:underline">
                  {c.done ? (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" aria-hidden />
                  ) : (
                    <Circle className="w-5 h-5 text-faint shrink-0" aria-hidden />
                  )}
                  <span className={c.done ? "text-muted line-through" : ""}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        {stats.map((st) => (
          <Link key={st.label} href={st.href} className="card p-4 hover:border-fg/20 transition">
            <st.icon className={`w-5 h-5 ${st.tone}`} aria-hidden />
            <p className="text-xl font-bold mt-2 tracking-tight">{st.value}</p>
            <p className="text-xs text-muted">{st.label}</p>
          </Link>
        ))}
      </section>

      {outOfStock > 0 && (
        <Link href="/proveedor/productos?estado=sinstock" className="card p-4 flex items-center gap-3 !border-warning/40 bg-warning/5">
          <PackageX className="w-5 h-5 text-warning" aria-hidden />
          <p className="text-sm">
            <strong>{outOfStock}</strong> {outOfStock === 1 ? "producto sin stock" : "productos sin stock"}: no se pueden pedir.
            Actualizalo.
          </p>
        </Link>
      )}

      <section className="grid grid-cols-3 gap-2">
        <Link href="/proveedor/productos/nuevo" className="btn-accent !py-3 flex-col !gap-1 text-xs">
          <Plus className="w-5 h-5" aria-hidden /> Producto
        </Link>
        <Link href={`/materiales/proveedor/${profile.id}`} className="btn-secondary !py-3 flex-col !gap-1 text-xs">
          <Store className="w-5 h-5" aria-hidden /> Mi tienda
        </Link>
        <Link href="/proveedor/perfil" className="btn-secondary !py-3 flex-col !gap-1 text-xs">
          <Pencil className="w-5 h-5" aria-hidden /> Comercio
        </Link>
      </section>

      <section>
        <SectionTitle title="Últimos pedidos" href="/proveedor/pedidos" />
        <div className="space-y-2.5">
          {recent.map((o) => {
            const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.PENDING;
            const n = parseItems(o.items).length;
            return (
              <Link key={o.id} href={`/proveedor/pedidos/${o.id}`} className="card p-4 flex items-center gap-3 hover:border-fg/20 transition">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">
                    #{orderNumber(o.id)} · {o.buyer.name.split(/\s+/)[0]}
                  </p>
                  <p className="text-xs text-muted">
                    {n} {n === 1 ? "producto" : "productos"} · {o.delivery === "DELIVERY" ? "Envío" : "Retiro"} · {timeAgo(o.createdAt)}
                  </p>
                  <span className={`${toneBadge(st.tone)} mt-1.5`}>{st.label}</span>
                </div>
                <p className="font-bold text-sm">{formatMoney(o.total ?? o.subtotal)}</p>
              </Link>
            );
          })}
          {recent.length === 0 && (
            <div className="card p-6 text-center text-sm text-muted">
              Todavía no recibiste pedidos. Cuando llegue uno, te avisamos con una notificación.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
