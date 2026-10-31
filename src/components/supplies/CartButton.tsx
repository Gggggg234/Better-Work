"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart";

/** Acceso al carrito con la cantidad de unidades. */
export function CartButton() {
  const { count } = useCart();
  return (
    <Link
      href="/materiales/carrito"
      className="relative btn-secondary !px-3 !py-2"
      aria-label={count > 0 ? `Carrito (${count})` : "Carrito"}
    >
      <ShoppingCart className="w-[18px] h-[18px]" aria-hidden />
      <span className="hidden sm:inline">Carrito</span>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-accent text-accent-fg text-[11px] font-bold leading-5 text-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
