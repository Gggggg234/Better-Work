import { notFound, redirect } from "next/navigation";
import { MessageCircle, Phone, Truck, Store, Wallet, PackageCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime, toneBadge } from "@/lib/format";
import { openConversation } from "@/lib/actions/chat";
import { confirmOrder, rejectOrder, advanceOrder } from "@/lib/actions/supplies";
import { ORDER_STATUS, orderNumber } from "@/lib/supplies";
import { BackButton } from "@/components/BackButton";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { OrderSteps, OrderItems } from "@/components/supplies/OrderSteps";

export default async function SupplierOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me?.supplierProfile) redirect("/proveedor");
  const { id } = await params;

  const o = await db.supplyOrder.findUnique({
    where: { id },
    include: { buyer: { select: { id: true, name: true, phone: true } } },
  });
  if (!o || o.supplierId !== me.supplierProfile.id) notFound();

  const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.PENDING;
  const chat = openConversation.bind(null, o.buyer.id);

  return (
    <main className="max-w-2xl mx-auto w-full px-4 py-5 space-y-5 animate-fade-up">
      <BackButton fallback="/proveedor/pedidos" />

      <div>
        <p className="text-sm text-muted">Pedido #{orderNumber(o.id)} · {formatDateTime(o.createdAt)}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight">{o.buyer.name}</h1>
          <span className={toneBadge(st.tone)}>{st.label}</span>
        </div>
      </div>

      <OrderSteps status={o.status} delivery={o.delivery} />

      <OrderItems items={o.items} subtotal={o.subtotal} total={o.total} />

      <section className="card divide-y divide-line text-sm">
        <div className="p-3.5 flex items-start gap-3">
          {o.delivery === "DELIVERY" ? <Truck className="w-4 h-4 text-muted mt-0.5" aria-hidden /> : <Store className="w-4 h-4 text-muted mt-0.5" aria-hidden />}
          <span className="text-muted w-28 shrink-0">{o.delivery === "DELIVERY" ? "Enviar a" : "Entrega"}</span>
          <span className="font-medium flex-1 text-right">{o.delivery === "DELIVERY" ? o.address : "Retira en el local"}</span>
        </div>
        {o.payMethod && (
          <div className="p-3.5 flex items-start gap-3">
            <Wallet className="w-4 h-4 text-muted mt-0.5" aria-hidden />
            <span className="text-muted w-28 shrink-0">Va a pagar con</span>
            <span className="font-medium flex-1 text-right">{o.payMethod}</span>
          </div>
        )}
        {o.note && <p className="p-3.5"><span className="text-muted">Nota del comprador:</span> {o.note}</p>}
        {o.supplierNote && <p className="p-3.5"><span className="text-muted">Tu mensaje:</span> {o.supplierNote}</p>}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <form action={chat} className="contents">
          <button className="btn-secondary">
            <MessageCircle className="w-4 h-4" aria-hidden /> Mensaje
          </button>
        </form>
        {o.buyer.phone ? (
          <a href={`tel:${o.buyer.phone}`} className="btn-secondary">
            <Phone className="w-4 h-4" aria-hidden /> Llamar
          </a>
        ) : (
          <span />
        )}
      </div>

      {/* ── Acciones según el estado ── */}
      {o.status === "PENDING" && (
        <>
          <form action={confirmOrder.bind(null, o.id)} className="card p-5 space-y-3 !border-accent/40">
            <div>
              <p className="font-semibold">Confirmar pedido</p>
              <p className="text-xs text-muted mt-0.5">
                Confirmá que tenés stock. Si hay envío u otro ajuste, poné el total final. Al confirmar se descuenta el
                stock.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="total">Total final (opcional)</label>
              <input id="total" name="total" type="number" min="0" step="0.01" defaultValue={o.subtotal} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="supplierNote">Mensaje para el comprador (opcional)</label>
              <input
                id="supplierNote"
                name="supplierNote"
                maxLength={300}
                className="input"
                placeholder={o.delivery === "DELIVERY" ? "Ej: te lo llevamos mañana entre 9 y 12" : "Ej: podés retirarlo desde mañana a las 9"}
              />
            </div>
            <FormSubmitButton pendingLabel="Confirmando…" className="!py-3">Confirmar pedido</FormSubmitButton>
          </form>
          <details className="card p-4">
            <summary className="text-sm text-danger font-medium cursor-pointer">No puedo tomar este pedido</summary>
            <form action={rejectOrder.bind(null, o.id)} className="space-y-2 mt-3">
              <input name="supplierNote" maxLength={300} className="input" placeholder="Motivo (ej: sin stock de cemento)" />
              <button className="btn-secondary w-full text-danger">Rechazar pedido</button>
            </form>
          </details>
        </>
      )}

      {o.status === "CONFIRMED" && (
        <div className="grid gap-2">
          {o.delivery === "PICKUP" ? (
            <form action={advanceOrder.bind(null, o.id, "READY")}>
              <FormSubmitButton pendingLabel="Avisando…" className="!py-3">
                <PackageCheck className="w-4 h-4" aria-hidden /> Listo para retirar
              </FormSubmitButton>
            </form>
          ) : (
            <form action={advanceOrder.bind(null, o.id, "SHIPPED")}>
              <FormSubmitButton pendingLabel="Avisando…" className="!py-3">
                <Truck className="w-4 h-4" aria-hidden /> Salió el envío
              </FormSubmitButton>
            </form>
          )}
        </div>
      )}

      {["CONFIRMED", "READY", "SHIPPED"].includes(o.status) && (
        <form action={advanceOrder.bind(null, o.id, "DELIVERED")}>
          <button className="btn-secondary w-full !py-3">Marcar como entregado</button>
        </form>
      )}
    </main>
  );
}
