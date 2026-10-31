"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { addToCart } from "./cart";

/** Vuelve a cargar al carrito los productos de un pedido anterior. */
export function ReorderButton({ supplierId, items }: { supplierId: string; items: { productId: string; qty: number }[] }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        items.forEach((i) => addToCart(i.productId, supplierId, i.qty));
        router.push("/materiales/carrito");
      }}
      className="btn-secondary w-full"
    >
      <RotateCcw className="w-4 h-4" aria-hidden /> Volver a pedir
    </button>
  );
}

/** Estrellas para la reseña (radio buttons accesibles). */
export function StarPicker({ name = "stars" }: { name?: string }) {
  const [value, setValue] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="cursor-pointer">
          <input type="radio" name={name} value={n} required className="sr-only" onChange={() => setValue(n)} />
          <span className={`text-3xl transition ${n <= value ? "text-warning" : "text-line"}`} aria-label={`${n} de 5`}>
            ★
          </span>
        </label>
      ))}
    </div>
  );
}
