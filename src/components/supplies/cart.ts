"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Carrito de materiales, guardado en el dispositivo (localStorage). Sólo
 * guarda qué y cuánto: el precio, el stock y la disponibilidad se piden al
 * servidor al abrir el carrito y se vuelven a validar al hacer el pedido.
 */

export type CartLine = { productId: string; supplierId: string; qty: number };

const KEY = "bw-cart-v1";
const EVENT = "bw-cart";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): CartLine[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((l) => l && typeof l.productId === "string" && l.qty > 0) : [];
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* sin almacenamiento (modo privado): el carrito vive sólo en memoria de la pestaña */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // otras pestañas
  window.addEventListener(EVENT, onChange); // esta pestaña
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useCart() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const lines = useMemo(() => parse(raw), [raw]);
  return {
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    qtyOf: (productId: string) => lines.find((l) => l.productId === productId)?.qty ?? 0,
  };
}

export function setQty(productId: string, supplierId: string, qty: number) {
  const lines = parse(read()).filter((l) => l.productId !== productId);
  if (qty > 0) lines.push({ productId, supplierId, qty: Math.min(999, Math.round(qty)) });
  write(lines);
}

export function addToCart(productId: string, supplierId: string, qty: number) {
  const current = parse(read()).find((l) => l.productId === productId)?.qty ?? 0;
  setQty(productId, supplierId, current + qty);
}

/** Saca del carrito todo lo de un proveedor (después de pedirle). */
export function clearSupplier(supplierId: string) {
  write(parse(read()).filter((l) => l.supplierId !== supplierId));
}
