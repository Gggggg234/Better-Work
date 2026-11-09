import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageCircle, Truck, Store, Clock, Wallet, Pencil, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, toneBadge } from "@/lib/format";
import { openConversation } from "@/lib/actions/chat";
import { discountPct, isOnSale, parseList, productCategory, stockLabel } from "@/lib/supplies";
import { BackButton } from "@/components/BackButton";
import { AddToCart } from "@/components/supplies/AddToCart";
import { ProductCard, ProductImage, SupplierCard } from "@/components/supplies/Cards";
import { SectionTitle } from "@/components/ui/ActionCards";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { id } = await params;

  const p = await db.product.findUnique({
    where: { id },
    include: {
      supplier: { include: { _count: { select: { products: { where: { active: true, hidden: false } } } } } },
    },
  });
  const isOwner = p?.supplier.userId === me.id;
  // Un producto pausado u oculto sólo lo ve su dueño (o el admin).
  if (!p || ((!p.active || p.hidden || !p.supplier.visible) && !isOwner && me.role !== "ADMIN")) notFound();

  const more = await db.product.findMany({
    where: { supplierId: p.supplierId, active: true, hidden: false, id: { not: p.id } },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const images = parseList(p.images);
  const sale = isOnSale(p);
  const stock = stockLabel(p.stock);
  const cat = productCategory(p.category);
  const s = p.supplier;
  const payMethods = parseList(s.payMethods);
  const chat = openConversation.bind(null, s.userId);

  return (
    <main className="max-w-3xl mx-auto w-full px-4 py-5 space-y-6 animate-fade-up">
      <BackButton fallback="/materiales" />

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Fotos */}
        <div className="space-y-2">
          <ProductImage images={p.images} category={p.category} className="w-full aspect-square rounded-2xl border border-line" />
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((src) => (
                <a key={src} href={src} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-16 h-16 rounded-xl object-cover border border-line" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Datos y compra */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {cat && (
                <Link href={`/materiales?rubro=${cat.slug}`} className="badge badge-neutral">
                  <cat.icon className="w-3 h-3" aria-hidden /> {cat.name}
                </Link>
              )}
              {!p.active && <span className="badge badge-warning">Pausado</span>}
              {p.hidden && <span className="badge badge-danger">Oculto por moderación</span>}
            </div>
            <h1 className="text-xl font-bold tracking-tight mt-2">{p.name}</h1>
            {p.brand && <p className="text-sm text-muted">Marca: {p.brand}</p>}
          </div>

          <div>
            {sale && (
              <p className="text-sm text-faint">
                <span className="line-through">{formatMoney(p.compareAtPrice!)}</span>{" "}
                <span className="badge bg-fg text-bg ml-1">-{discountPct(p)}%</span>
              </p>
            )}
            <p className="text-3xl font-bold tracking-tight">
              {formatMoney(p.price)}
              <span className="text-sm font-normal text-muted"> / {p.unit}</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={toneBadge(stock.tone)}>{stock.text}</span>
              {p.sku && <span className="text-[11px] text-faint">Cód. {p.sku}</span>}
            </div>
          </div>

          {isOwner ? (
            <Link href={`/proveedor/productos/${p.id}`} className="btn-primary w-full !py-3">
              <Pencil className="w-4 h-4" aria-hidden /> Editar producto
            </Link>
          ) : (
            <AddToCart
              productId={p.id}
              supplierId={p.supplierId}
              unit={p.unit}
              maxQty={p.stock}
              disabled={p.stock != null && p.stock <= 0}
            />
          )}

          {!isOwner && (
            <form action={chat}>
              <button className="btn-secondary w-full">
                <MessageCircle className="w-4 h-4" aria-hidden /> Consultar al proveedor
              </button>
            </form>
          )}
        </div>
      </div>

      {p.description && (
        <section className="card p-5">
          <h2 className="font-semibold text-sm mb-2">Descripción</h2>
          <p className="text-sm text-muted whitespace-pre-line">{p.description}</p>
        </section>
      )}

      {/* Proveedor y condiciones */}
      <section className="space-y-3">
        <SectionTitle title="Lo vende" />
        <SupplierCard s={{ ...s, productCount: s._count.products }} />
        <div className="card divide-y divide-line text-sm">
          <Condition icon={Store} label="Retiro en el local" value={s.pickup ? s.address || "Sí" : "No"} />
          <Condition
            icon={Truck}
            label="Envío"
            value={s.delivery ? `Hasta ${s.deliveryRadiusKm} km${s.deliveryFee ? ` · ${s.deliveryFee}` : ""}` : "No hace envíos"}
          />
          {s.hours && <Condition icon={Clock} label="Horario" value={s.hours} />}
          {payMethods.length > 0 && <Condition icon={Wallet} label="Formas de pago" value={payMethods.join(", ")} />}
          {s.minOrder && <Condition icon={ShoppingBag} label="Pedido mínimo" value={formatMoney(s.minOrder)} />}
        </div>
        <p className="text-[11px] text-faint">
          El pago es directo al proveedor, al retirar o al recibir el pedido. Manobra no cobra recargo.
        </p>
      </section>

      {more.length > 0 && (
        <section>
          <SectionTitle title="Más de este proveedor" href={`/materiales/proveedor/${s.id}`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {more.map((m) => (
              <ProductCard key={m.id} p={{ ...m, supplierName: s.businessName }} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Condition({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="p-3.5 flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted mt-0.5 shrink-0" aria-hidden />
      <span className="text-muted w-32 shrink-0">{label}</span>
      <span className="font-medium flex-1 text-right">{value}</span>
    </div>
  );
}
