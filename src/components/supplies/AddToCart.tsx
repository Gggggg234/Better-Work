"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { addToCart, useCart } from "./cart";

/** Selector de cantidad + agregar al carrito (ficha del producto). */
export function AddToCart({
  productId,
  supplierId,
  unit,
  maxQty,
  disabled = false,
}: {
  productId: string;
  supplierId: string;
  unit: string;
  /** Stock disponible (null = sin control). */
  maxQty: number | null;
  disabled?: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { qtyOf } = useCart();
  const inCart = qtyOf(productId);
  const limit = maxQty == null ? 999 : Math.max(0, maxQty - inCart);

  if (disabled) {
    return <button disabled className="btn-secondary w-full !py-3">Sin stock</button>;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-line bg-surface">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-11 h-11 flex items-center justify-center text-muted hover:text-fg disabled:opacity-30"
            disabled={qty <= 1}
            aria-label="Menos"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(limit, q + 1))}
            className="w-11 h-11 flex items-center justify-center text-muted hover:text-fg disabled:opacity-30"
            disabled={qty >= limit}
            aria-label="Más"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <span className="text-sm text-muted">{unit === "unidad" ? (qty === 1 ? "unidad" : "unidades") : unit}</span>
      </div>

      <button
        type="button"
        disabled={limit <= 0}
        onClick={() => {
          addToCart(productId, supplierId, Math.min(qty, limit));
          setAdded(true);
          setQty(1);
          setTimeout(() => setAdded(false), 2200);
        }}
        className="btn-accent w-full !py-3"
      >
        {added ? <Check className="w-[18px] h-[18px]" /> : <ShoppingCart className="w-[18px] h-[18px]" />}
        {added ? "Agregado al carrito" : limit <= 0 ? "Ya tenés todo el stock en el carrito" : "Agregar al carrito"}
      </button>
      {inCart > 0 && (
        <Link href="/materiales/carrito" className="btn-secondary w-full !py-2.5">
          Ver carrito ({inCart} en el carrito)
        </Link>
      )}
    </div>
  );
}
