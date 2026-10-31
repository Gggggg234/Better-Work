"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, Store, Truck, ShoppingCart, Info } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { getCartProducts, placeOrder, type CartProduct } from "@/lib/actions/supplies";
import { clearSupplier, setQty, useCart } from "./cart";

export function CartView() {
  const { lines } = useCart();
  const ids = useMemo(() => lines.map((l) => l.productId).sort().join(","), [lines]);
  // Resultado de la última consulta, con la lista que se consultó.
  const [fetched, setFetched] = useState<{ ids: string; products: CartProduct[] } | null>(null);

  // Precio, stock y condiciones actuales desde el servidor.
  useEffect(() => {
    if (!ids) return;
    let cancel = false;
    getCartProducts(ids.split(","))
      .then((r) => !cancel && setFetched({ ids, products: r }))
      .catch(() => !cancel && setFetched({ ids, products: [] }));
    return () => {
      cancel = true;
    };
  }, [ids]);

  // Carrito vacío: no hay nada que consultar. Si la consulta es de otra lista, está cargando.
  const products = !ids ? [] : fetched?.ids === ids ? fetched.products : null;

  if (products === null) {
    return <div className="card p-8 text-center text-sm text-muted">Cargando el carrito…</div>;
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const groups = new Map<string, { supplier: CartProduct["supplier"]; rows: { p: CartProduct; qty: number }[] }>();
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p) continue;
    const g = groups.get(p.supplier.id) ?? { supplier: p.supplier, rows: [] };
    g.rows.push({ p, qty: l.qty });
    groups.set(p.supplier.id, g);
  }
  // Productos que ya no existen: se limpian solos.
  const missing = lines.filter((l) => !byId.has(l.productId));

  if (groups.size === 0) {
    return (
      <div className="card p-8 text-center">
        <span className="icon-tile w-14 h-14 bg-surface-2 text-muted mx-auto">
          <ShoppingCart className="w-7 h-7" aria-hidden />
        </span>
        <p className="font-semibold mt-4">Tu carrito está vacío</p>
        <p className="text-sm text-muted mt-1">Buscá materiales y agregalos para pedírselos a un proveedor.</p>
        {missing.length > 0 && (
          <button onClick={() => missing.forEach((m) => setQty(m.productId, m.supplierId, 0))} className="btn-ghost mt-2 !text-xs">
            Limpiar productos que ya no están
          </button>
        )}
        <Link href="/materiales" className="btn-primary mt-4 inline-flex">Ver materiales</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted flex items-start gap-1.5">
        <Info className="w-4 h-4 shrink-0" aria-hidden />
        Cada proveedor recibe su pedido por separado. Confirma stock y total (con el envío, si corresponde) y le pagás
        directo al retirar o al recibir.
      </p>
      {[...groups.values()].map((g) => (
        <SupplierCheckout key={g.supplier.id} supplier={g.supplier} rows={g.rows} />
      ))}
    </div>
  );
}

function SupplierCheckout({
  supplier,
  rows,
}: {
  supplier: CartProduct["supplier"];
  rows: { p: CartProduct; qty: number }[];
}) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<"PICKUP" | "DELIVERY">(supplier.pickup ? "PICKUP" : "DELIVERY");
  const [address, setAddress] = useState("");
  const [payMethod, setPayMethod] = useState(supplier.payMethods[0] ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const available = rows.filter((r) => r.p.available);
  const subtotal = available.reduce((s, r) => s + r.p.price * r.qty, 0);
  const belowMin = supplier.minOrder != null && subtotal < supplier.minOrder;
  const overStock = available.some((r) => r.p.stock != null && r.qty > r.p.stock);

  function submit() {
    setError("");
    start(async () => {
      const res = await placeOrder({
        supplierId: supplier.id,
        items: available.map((r) => ({ productId: r.p.id, qty: r.qty })),
        delivery,
        address,
        payMethod,
        note,
      });
      if (!res.ok) return setError(res.error);
      clearSupplier(supplier.id);
      router.push(`/materiales/pedidos/${res.orderId}?nuevo=1`);
    });
  }

  return (
    <section className="card overflow-hidden">
      <div className="px-4 py-3 bg-surface-2 flex items-center justify-between gap-3">
        <p className="font-semibold text-sm flex items-center gap-2">
          <Store className="w-4 h-4" aria-hidden /> {supplier.businessName}
        </p>
        <Link href={`/materiales/proveedor/${supplier.id}`} className="text-xs text-accent font-medium">Ver tienda</Link>
      </div>

      <ul className="divide-y divide-line">
        {rows.map(({ p, qty }) => (
          <li key={p.id} className={`p-4 flex gap-3 ${p.available ? "" : "opacity-60"}`}>
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="w-16 h-16 rounded-xl object-cover bg-surface-2 shrink-0" />
            ) : (
              <span className="w-16 h-16 rounded-xl bg-surface-2 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/materiales/p/${p.id}`} className="text-sm font-medium leading-snug line-clamp-2 hover:underline">
                {p.name}
              </Link>
              <p className="text-xs text-muted mt-0.5">
                {formatMoney(p.price)} / {p.unit}
              </p>
              {!p.available && <p className="text-xs text-danger mt-0.5">No disponible: no se incluye en el pedido.</p>}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center rounded-lg border border-line">
                  <button
                    onClick={() => setQty(p.id, supplier.id, qty - 1)}
                    className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg"
                    aria-label="Menos"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
                  <button
                    onClick={() => setQty(p.id, supplier.id, qty + 1)}
                    disabled={p.stock != null && qty >= p.stock}
                    className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg disabled:opacity-30"
                    aria-label="Más"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${p.available ? "" : "line-through text-faint"}`}>
                    {formatMoney(p.price * qty)}
                  </span>
                  <button
                    onClick={() => setQty(p.id, supplier.id, 0)}
                    className="p-1.5 text-faint hover:text-danger"
                    aria-label={`Quitar ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {p.available && p.stock != null && qty > p.stock && (
                <p className="text-xs text-danger mt-1">Hay {p.stock} disponibles: bajá la cantidad.</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Entrega, pago y envío del pedido */}
      <div className="p-4 space-y-4 border-t border-line">
        <div>
          <p className="label">Entrega</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!supplier.pickup}
              onClick={() => setDelivery("PICKUP")}
              className={`rounded-xl border p-3 text-left transition disabled:opacity-40 ${
                delivery === "PICKUP" ? "border-fg bg-surface-2" : "border-line"
              }`}
            >
              <Store className="w-4 h-4" aria-hidden />
              <p className="text-sm font-semibold mt-1">Retiro</p>
              <p className="text-[11px] text-muted">{supplier.pickup ? supplier.address || supplier.zone || "En el local" : "No disponible"}</p>
            </button>
            <button
              type="button"
              disabled={!supplier.delivery}
              onClick={() => setDelivery("DELIVERY")}
              className={`rounded-xl border p-3 text-left transition disabled:opacity-40 ${
                delivery === "DELIVERY" ? "border-fg bg-surface-2" : "border-line"
              }`}
            >
              <Truck className="w-4 h-4" aria-hidden />
              <p className="text-sm font-semibold mt-1">Envío</p>
              <p className="text-[11px] text-muted">{supplier.delivery ? supplier.deliveryFee || "A coordinar" : "No disponible"}</p>
            </button>
          </div>
        </div>

        {delivery === "DELIVERY" && (
          <div>
            <label className="label" htmlFor={`addr-${supplier.id}`}>Dirección de entrega</label>
            <input
              id={`addr-${supplier.id}`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input"
              placeholder="Calle, número, barrio"
              maxLength={200}
            />
          </div>
        )}

        {supplier.payMethods.length > 0 && (
          <div>
            <label className="label" htmlFor={`pay-${supplier.id}`}>¿Cómo vas a pagar?</label>
            <select id={`pay-${supplier.id}`} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="input">
              {supplier.payMethods.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor={`note-${supplier.id}`}>Nota para el proveedor (opcional)</label>
          <textarea
            id={`note-${supplier.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input min-h-16"
            placeholder="Ej: paso a retirar mañana a la tarde"
            maxLength={500}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Subtotal</span>
          <span className="text-lg font-bold">{formatMoney(subtotal)}</span>
        </div>
        {belowMin && (
          <p className="text-xs text-warning">El pedido mínimo de este proveedor es {formatMoney(supplier.minOrder!)}.</p>
        )}
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}

        <button
          onClick={submit}
          disabled={pending || available.length === 0 || belowMin || overStock}
          className="btn-accent w-full !py-3"
          aria-busy={pending}
        >
          {pending ? "Enviando pedido…" : `Enviar pedido a ${supplier.businessName}`}
        </button>
        <p className="text-[11px] text-faint text-center">
          Todavía no pagás nada: el proveedor confirma stock y total, y le pagás directo al {delivery === "DELIVERY" ? "recibir" : "retirar"}.
        </p>
      </div>
    </section>
  );
}
