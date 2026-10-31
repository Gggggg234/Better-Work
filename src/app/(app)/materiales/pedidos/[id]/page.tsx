import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageCircle, Store, Truck, Wallet, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime, toneBadge } from "@/lib/format";
import { openConversation } from "@/lib/actions/chat";
import { cancelOrder, reviewSupplier } from "@/lib/actions/supplies";
import { ORDER_STATUS, orderNumber, parseItems } from "@/lib/supplies";
import { BackButton } from "@/components/BackButton";
import { CopyField } from "@/components/CopyField";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { SupplierCard } from "@/components/supplies/Cards";
import { OrderSteps, OrderItems } from "@/components/supplies/OrderSteps";
import { ReorderButton, StarPicker } from "@/components/supplies/OrderParts";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;

  const o = await db.supplyOrder.findUnique({
    where: { id },
    include: {
      supplier: { include: { _count: { select: { products: { where: { active: true, hidden: false } } } } } },
      review: true,
    },
  });
  if (!o) notFound();
  // El dueño del pedido; el proveedor lo gestiona desde su panel.
  if (o.buyerId !== me.id) {
    if (o.supplier.userId === me.id) redirect(`/proveedor/pedidos/${o.id}`);
    if (me.role !== "ADMIN") notFound();
  }

  const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.PENDING;
  const s = o.supplier;
  const chat = openConversation.bind(null, s.userId);
  const items = parseItems(o.items);

  return (
    <main className="max-w-2xl mx-auto w-full px-4 py-5 space-y-5 animate-fade-up">
      <BackButton fallback="/materiales/pedidos" />

      {sp.nuevo === "1" && (
        <div className="card p-4 flex items-start gap-3 !border-success/40 bg-success/5">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-semibold">¡Pedido enviado!</p>
            <p className="text-xs text-muted mt-0.5">
              {s.businessName} lo va a revisar y confirmar el total. Te avisamos con una notificación.
            </p>
          </div>
        </div>
      )}

      <div>
        <p className="text-sm text-muted">Pedido #{orderNumber(o.id)} · {formatDateTime(o.createdAt)}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight">{s.businessName}</h1>
          <span className={toneBadge(st.tone)}>{st.label}</span>
        </div>
        {/* Cancelado o rechazado: el aviso ya lo muestra OrderSteps */}
        {!["CANCELLED", "REJECTED"].includes(o.status) && <p className="text-sm text-muted mt-1">{st.hint}</p>}
      </div>

      <OrderSteps status={o.status} delivery={o.delivery} />

      {o.supplierNote && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-muted">Mensaje del proveedor</p>
          <p className="text-sm mt-1 whitespace-pre-line">{o.supplierNote}</p>
        </div>
      )}

      <OrderItems items={o.items} subtotal={o.subtotal} total={o.total} />

      <section className="card divide-y divide-line text-sm">
        <div className="p-3.5 flex items-start gap-3">
          {o.delivery === "DELIVERY" ? <Truck className="w-4 h-4 text-muted mt-0.5" aria-hidden /> : <Store className="w-4 h-4 text-muted mt-0.5" aria-hidden />}
          <span className="text-muted w-28 shrink-0">{o.delivery === "DELIVERY" ? "Envío a" : "Retiro en"}</span>
          <span className="font-medium flex-1 text-right">
            {o.delivery === "DELIVERY" ? o.address : [s.address, s.zone].filter(Boolean).join(", ") || "El local"}
          </span>
        </div>
        {o.payMethod && (
          <div className="p-3.5 flex items-start gap-3">
            <Wallet className="w-4 h-4 text-muted mt-0.5" aria-hidden />
            <span className="text-muted w-28 shrink-0">Pago</span>
            <span className="font-medium flex-1 text-right">{o.payMethod}</span>
          </div>
        )}
        {o.note && <p className="p-3.5 text-muted">Tu nota: {o.note}</p>}
      </section>

      {o.payMethod === "Transferencia" && s.payAlias && !["CANCELLED", "REJECTED"].includes(o.status) && (
        <div className="space-y-1.5">
          <CopyField label="Alias del proveedor" value={s.payAlias} />
          {o.status === "PENDING" && (
            <p className="text-[11px] text-faint">Transferí recién cuando el proveedor confirme el total.</p>
          )}
        </div>
      )}

      <form action={chat}>
        <button className="btn-secondary w-full">
          <MessageCircle className="w-4 h-4" aria-hidden /> Escribirle a {s.businessName}
        </button>
      </form>

      {["PENDING", "CONFIRMED"].includes(o.status) && (
        <div className="flex justify-center">
          <ConfirmDeleteButton
            action={cancelOrder.bind(null, o.id)}
            confirmText={`¿Cancelar el pedido #${orderNumber(o.id)}? ${s.businessName} recibe el aviso.`}
            label="Cancelar pedido"
          />
        </div>
      )}

      {/* Reseña una vez entregado */}
      {o.status === "DELIVERED" &&
        (o.review ? (
          <div className="card p-4">
            <p className="text-sm font-semibold">Tu reseña</p>
            <p className="text-warning mt-1">{"★".repeat(o.review.stars)}</p>
            {o.review.comment && <p className="text-sm text-muted mt-1">{o.review.comment}</p>}
          </div>
        ) : (
          <form action={reviewSupplier.bind(null, o.id)} className="card p-5 space-y-3">
            <div>
              <p className="font-semibold text-sm">¿Cómo te fue con {s.businessName}?</p>
              <p className="text-xs text-muted mt-0.5">Tu reseña ayuda a otros a elegir proveedor.</p>
            </div>
            <StarPicker />
            <textarea name="comment" className="input min-h-16" placeholder="Atención, tiempos, calidad… (opcional)" maxLength={600} />
            <FormSubmitButton pendingLabel="Enviando…" className="!py-2.5">Enviar reseña</FormSubmitButton>
          </form>
        ))}

      {["DELIVERED", "CANCELLED", "REJECTED"].includes(o.status) && items.length > 0 && (
        <ReorderButton supplierId={s.id} items={items.map((i) => ({ productId: i.productId, qty: i.qty }))} />
      )}

      <SupplierCard s={{ ...s, productCount: s._count.products }} />
      <p className="text-center">
        <Link href="/materiales/pedidos" className="text-sm text-accent font-medium">Ver todos mis pedidos</Link>
      </p>
    </main>
  );
}
