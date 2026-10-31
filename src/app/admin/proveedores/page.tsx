import Link from "next/link";
import { db } from "@/lib/db";
import { toggleSupplierVerified, toggleProductHidden } from "@/lib/actions/admin";
import { formatMoney, timeAgo } from "@/lib/format";
import { productCategory } from "@/lib/supplies";
import { SupplierLogo, ProductImage } from "@/components/supplies/Cards";

export default async function AdminSuppliersPage() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [suppliers, products, ordersMonth] = await Promise.all([
    db.supplierProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { email: true, suspended: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
    db.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { supplier: { select: { businessName: true } } },
    }),
    db.supplyOrder.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Proveedores</h1>
        <p className="text-sm text-muted mt-0.5">
          Comercios que venden materiales. {suppliers.length} {suppliers.length === 1 ? "proveedor" : "proveedores"} ·{" "}
          {ordersMonth} {ordersMonth === 1 ? "pedido" : "pedidos"} este mes.
        </p>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Comercios</h2>
        <div className="card divide-y divide-line">
          {suppliers.map((s) => (
            <div key={s.id} className="p-4 flex items-center gap-3">
              <SupplierLogo name={s.businessName} url={s.logoUrl} size={40} />
              <div className="min-w-0 flex-1">
                <Link href={`/materiales/proveedor/${s.id}`} className="font-medium text-sm hover:underline truncate block">
                  {s.businessName}
                </Link>
                <p className="text-xs text-faint truncate">
                  {s.user.email} · {s._count.products} productos · {s._count.orders} pedidos
                  {!s.visible && " · tienda oculta"}
                  {s.user.suspended && " · cuenta suspendida"}
                </p>
              </div>
              <form action={toggleSupplierVerified.bind(null, s.id)}>
                <button className={`badge ${s.verified ? "badge-accent" : "badge-neutral"} cursor-pointer`}>
                  {s.verified ? "✓ Verificado" : "Verificar"}
                </button>
              </form>
            </div>
          ))}
          {suppliers.length === 0 && <p className="p-5 text-sm text-muted text-center">Todavía no hay proveedores.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Productos recientes</h2>
        <p className="text-xs text-muted mb-3">Ocultá los que no correspondan: dejan de verse en el catálogo y el proveedor ve el aviso.</p>
        <div className="card divide-y divide-line">
          {products.map((p) => (
            <div key={p.id} className={`p-3.5 flex items-center gap-3 ${p.hidden ? "opacity-60" : ""}`}>
              <ProductImage images={p.images} category={p.category} className="w-12 h-12 rounded-lg shrink-0" />
              <div className="min-w-0 flex-1">
                <Link href={`/materiales/p/${p.id}`} className="text-sm font-medium hover:underline line-clamp-1">{p.name}</Link>
                <p className="text-xs text-faint truncate">
                  {p.supplier.businessName} · {formatMoney(p.price)} · {productCategory(p.category)?.name ?? p.category} ·{" "}
                  {timeAgo(p.createdAt)}
                </p>
              </div>
              <form action={toggleProductHidden.bind(null, p.id)}>
                <button className={`btn-ghost !py-1.5 !px-2.5 !text-xs ${p.hidden ? "" : "text-danger"}`}>
                  {p.hidden ? "Mostrar" : "Ocultar"}
                </button>
              </form>
            </div>
          ))}
          {products.length === 0 && <p className="p-5 text-sm text-muted text-center">Todavía no hay productos.</p>}
        </div>
      </section>
    </div>
  );
}
