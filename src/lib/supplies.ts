import {
  Droplets,
  Zap,
  BrickWall,
  PaintBucket,
  Wrench,
  Hammer,
  Flame,
  TreePine,
  LayoutGrid,
  Leaf,
  SprayCan,
  HardHat,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/lib/format";

/**
 * Materiales y proveedores: catálogos fijos y reglas compartidas entre el
 * catálogo (compradores), el panel del proveedor y el admin.
 */

export type ProductCategory = { slug: string; name: string; icon: LucideIcon };

/** Rubros de productos. El orden es el de los filtros. */
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { slug: "plomeria", name: "Plomería y sanitarios", icon: Droplets },
  { slug: "electricidad", name: "Electricidad e iluminación", icon: Zap },
  { slug: "construccion", name: "Materiales de construcción", icon: BrickWall },
  { slug: "pintura", name: "Pinturería", icon: PaintBucket },
  { slug: "herramientas", name: "Herramientas", icon: Wrench },
  { slug: "ferreteria", name: "Ferretería y bulonería", icon: Hammer },
  { slug: "gas", name: "Gas y calefacción", icon: Flame },
  { slug: "maderas", name: "Maderas y carpintería", icon: TreePine },
  { slug: "pisos", name: "Pisos y revestimientos", icon: LayoutGrid },
  { slug: "jardin", name: "Jardín y exterior", icon: Leaf },
  { slug: "limpieza", name: "Limpieza", icon: SprayCan },
  { slug: "seguridad", name: "Seguridad e indumentaria", icon: HardHat },
];

export function productCategory(slug: string): ProductCategory | undefined {
  return PRODUCT_CATEGORIES.find((c) => c.slug === slug);
}

/** Del oficio de un trabajo al rubro de materiales (para "Comprar materiales"). */
export const TRADE_TO_RUBRO: Record<string, string> = {
  plomeria: "plomeria",
  electricidad: "electricidad",
  albanileria: "construccion",
  pintura: "pintura",
  carpinteria: "maderas",
  jardineria: "jardin",
  limpieza: "limpieza",
  tecnicos: "herramientas",
};

export const PRODUCT_UNITS = ["unidad", "metro", "m²", "m³", "kg", "bolsa", "litro", "caja", "rollo", "par", "juego"];

export const SUPPLY_PAY_METHODS = ["Efectivo", "Transferencia", "Mercado Pago", "Tarjeta de débito", "Tarjeta de crédito"];

export const ORDER_STATUS: Record<string, { label: string; tone: Tone; hint: string }> = {
  PENDING: { label: "Esperando confirmación", tone: "warning", hint: "El proveedor tiene que confirmar stock y total." },
  CONFIRMED: { label: "Confirmado", tone: "accent", hint: "El proveedor está preparando el pedido." },
  READY: { label: "Listo para retirar", tone: "success", hint: "Podés pasar a buscarlo por el local." },
  SHIPPED: { label: "En camino", tone: "accent", hint: "El pedido salió hacia tu dirección." },
  DELIVERED: { label: "Entregado", tone: "success", hint: "Pedido completado." },
  CANCELLED: { label: "Cancelado", tone: "danger", hint: "El pedido se canceló." },
  REJECTED: { label: "Rechazado", tone: "danger", hint: "El proveedor no pudo tomar el pedido." },
};

/** Estados en los que el pedido sigue abierto. */
export const OPEN_ORDER_STATUSES = ["PENDING", "CONFIRMED", "READY", "SHIPPED"];

/** Nº corto y legible del pedido (para hablar por teléfono o WhatsApp). */
export function orderNumber(id: string): string {
  return id.slice(-6).toUpperCase();
}

export function parseList(json: string): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export type OrderItem = { productId: string; name: string; price: number; qty: number; unit: string; image?: string };

export function parseItems(json: string): OrderItem[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Está en oferta si tiene un precio anterior mayor al actual. */
export function isOnSale(p: { price: number; compareAtPrice: number | null }): boolean {
  return p.compareAtPrice != null && p.compareAtPrice > p.price;
}

export function discountPct(p: { price: number; compareAtPrice: number | null }): number {
  if (!isOnSale(p)) return 0;
  return Math.round((1 - p.price / p.compareAtPrice!) * 100);
}

/** Texto de stock para el comprador. */
export function stockLabel(stock: number | null): { text: string; tone: Tone } {
  if (stock == null) return { text: "Consultar stock", tone: "neutral" };
  if (stock <= 0) return { text: "Sin stock", tone: "danger" };
  if (stock <= 5) return { text: `Últimas ${stock}`, tone: "warning" };
  return { text: "En stock", tone: "success" };
}
