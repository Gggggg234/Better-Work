"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { trySaveImage, deleteUpload } from "@/lib/upload";
import { notify } from "@/lib/notify";
import { formatMoney } from "@/lib/format";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  SUPPLY_PAY_METHODS,
  orderNumber,
  parseItems,
  parseList,
  type OrderItem,
} from "@/lib/supplies";

const MAX_IMAGES = 6;

/** El proveedor logueado y su perfil (lo crea si faltara, p. ej. cuentas viejas). */
async function mySupplier() {
  const user = await requireRole("SUPPLIER");
  const profile =
    (await db.supplierProfile.findUnique({ where: { userId: user.id } })) ??
    (await db.supplierProfile.create({ data: { userId: user.id, businessName: user.name } }));
  return { user, profile };
}

function str(fd: FormData, key: string, max = 200): string {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

function num(fd: FormData, key: string): number | null {
  const raw = String(fd.get(key) ?? "").trim();
  if (!raw) return null;
  const v = parseFloat(raw.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

/* ───────────────────────── Proveedor: perfil del comercio ───────────────────────── */

export async function saveSupplierProfile(formData: FormData): Promise<void> {
  const { profile } = await mySupplier();

  const businessName = str(formData, "businessName", 80);
  if (!businessName) redirect("/proveedor/perfil?error=nombre");

  const rubros = formData.getAll("rubros").map(String).filter((r) => PRODUCT_CATEGORIES.some((c) => c.slug === r));
  const payMethods = formData.getAll("payMethods").map(String).filter((m) => SUPPLY_PAY_METHODS.includes(m));
  const lat = num(formData, "lat");
  const lng = num(formData, "lng");
  const radius = num(formData, "deliveryRadiusKm");
  const minOrder = num(formData, "minOrder");

  let logoUrl = profile.logoUrl;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const saved = await trySaveImage(logo);
    if (!saved) redirect("/proveedor/perfil?error=logo");
    if (logoUrl) await deleteUpload(logoUrl).catch(() => {});
    logoUrl = saved;
  }

  await db.supplierProfile.update({
    where: { id: profile.id },
    data: {
      businessName,
      description: str(formData, "description", 600),
      logoUrl,
      phone: str(formData, "phone", 40),
      whatsapp: str(formData, "whatsapp", 40),
      address: str(formData, "address", 160),
      city: str(formData, "city", 80),
      zone: str(formData, "zone", 80),
      lat: lat ?? profile.lat,
      lng: lng ?? profile.lng,
      hours: str(formData, "hours", 160),
      rubros: JSON.stringify(rubros),
      pickup: formData.get("pickup") === "on",
      delivery: formData.get("delivery") === "on",
      deliveryRadiusKm: radius != null && radius > 0 && radius <= 500 ? radius : profile.deliveryRadiusKm,
      deliveryFee: str(formData, "deliveryFee", 120),
      minOrder: minOrder != null && minOrder > 0 ? Math.round(minOrder) : null,
      payMethods: JSON.stringify(payMethods),
      payAlias: str(formData, "payAlias", 80),
      visible: formData.get("visible") === "on",
    },
  });

  revalidatePath("/proveedor");
  revalidatePath("/materiales", "layout");
  redirect("/proveedor?ok=perfil");
}

/* ───────────────────────── Proveedor: productos ───────────────────────── */

/** Crea (productId null) o edita un producto del proveedor logueado. */
export async function saveProduct(productId: string | null, formData: FormData): Promise<void> {
  const { profile } = await mySupplier();
  const back = productId ? `/proveedor/productos/${productId}` : "/proveedor/productos/nuevo";

  const existing = productId ? await db.product.findUnique({ where: { id: productId } }) : null;
  if (productId && (!existing || existing.supplierId !== profile.id)) redirect("/proveedor/productos");

  const name = str(formData, "name", 120);
  const category = str(formData, "category", 40);
  const unit = str(formData, "unit", 20);
  const price = num(formData, "price");
  if (!name) redirect(`${back}?error=nombre`);
  if (!PRODUCT_CATEGORIES.some((c) => c.slug === category)) redirect(`${back}?error=rubro`);
  if (price == null || price <= 0) redirect(`${back}?error=precio`);

  const compare = num(formData, "compareAtPrice");
  const stockRaw = num(formData, "stock");

  // Fotos: las que se conservan + las nuevas, hasta 6.
  const kept = formData
    .getAll("keptImages")
    .map(String)
    .filter((u) => parseList(existing?.images ?? "[]").includes(u));
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const added: string[] = [];
  for (const f of files.slice(0, Math.max(0, MAX_IMAGES - kept.length))) {
    const url = await trySaveImage(f);
    if (url) added.push(url);
  }
  // Las que se quitaron se borran del almacenamiento.
  for (const old of parseList(existing?.images ?? "[]")) {
    if (!kept.includes(old)) await deleteUpload(old).catch(() => {});
  }

  const data = {
    name,
    description: str(formData, "description", 2000),
    category,
    brand: str(formData, "brand", 60),
    unit: PRODUCT_UNITS.includes(unit) ? unit : "unidad",
    price: Math.round(price * 100) / 100,
    // Precio anterior sólo si es mayor (si no, no es una oferta).
    compareAtPrice: compare != null && compare > price ? Math.round(compare * 100) / 100 : null,
    stock: stockRaw == null ? null : Math.max(0, Math.round(stockRaw)),
    sku: str(formData, "sku", 60),
    images: JSON.stringify([...kept, ...added]),
    active: formData.get("active") === "on",
  };

  if (existing) await db.product.update({ where: { id: existing.id }, data });
  else await db.product.create({ data: { ...data, supplierId: profile.id } });

  revalidatePath("/proveedor", "layout");
  revalidatePath("/materiales", "layout");
  redirect("/proveedor/productos?ok=guardado");
}

/** Publicar / pausar un producto. */
export async function toggleProductActive(productId: string): Promise<void> {
  const { profile } = await mySupplier();
  const p = await db.product.findUnique({ where: { id: productId } });
  if (!p || p.supplierId !== profile.id) return;
  await db.product.update({ where: { id: p.id }, data: { active: !p.active } });
  revalidatePath("/proveedor/productos");
  revalidatePath("/materiales", "layout");
}

/** Cambio rápido de stock desde la lista (vacío = sin control de stock). */
export async function updateStock(productId: string, formData: FormData): Promise<void> {
  const { profile } = await mySupplier();
  const p = await db.product.findUnique({ where: { id: productId } });
  if (!p || p.supplierId !== profile.id) return;
  const v = num(formData, "stock");
  await db.product.update({ where: { id: p.id }, data: { stock: v == null ? null : Math.max(0, Math.round(v)) } });
  revalidatePath("/proveedor/productos");
  revalidatePath("/materiales", "layout");
}

export async function deleteProduct(productId: string): Promise<void> {
  const { profile } = await mySupplier();
  const p = await db.product.findUnique({ where: { id: productId } });
  if (!p || p.supplierId !== profile.id) return;
  // Los pedidos guardan su propia copia del producto: borrarlo no los afecta.
  await db.product.delete({ where: { id: p.id } });
  for (const url of parseList(p.images)) await deleteUpload(url).catch(() => {});
  revalidatePath("/proveedor/productos");
  revalidatePath("/materiales", "layout");
  redirect("/proveedor/productos?ok=borrado");
}

/* ───────────────────────── Comprador: datos del carrito ───────────────────────── */

export type CartProduct = {
  id: string;
  name: string;
  price: number;
  unit: string;
  stock: number | null;
  image: string | null;
  available: boolean;
  supplier: {
    id: string;
    businessName: string;
    pickup: boolean;
    delivery: boolean;
    deliveryFee: string;
    minOrder: number | null;
    payMethods: string[];
    address: string;
    zone: string;
  };
};

/** Precio, stock y datos del proveedor ACTUALES de los productos del carrito. */
export async function getCartProducts(ids: string[]): Promise<CartProduct[]> {
  await requireUser();
  const clean = [...new Set(ids)].filter((x) => typeof x === "string").slice(0, 100);
  if (clean.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: clean } },
    include: { supplier: true },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    unit: p.unit,
    stock: p.stock,
    image: parseList(p.images)[0] ?? null,
    available: p.active && !p.hidden && p.supplier.visible && (p.stock == null || p.stock > 0),
    supplier: {
      id: p.supplier.id,
      businessName: p.supplier.businessName,
      pickup: p.supplier.pickup,
      delivery: p.supplier.delivery,
      deliveryFee: p.supplier.deliveryFee,
      minOrder: p.supplier.minOrder,
      payMethods: parseList(p.supplier.payMethods),
      address: p.supplier.address,
      zone: p.supplier.zone,
    },
  }));
}

/* ───────────────────────── Comprador: pedido ───────────────────────── */

export type PlaceOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

/**
 * Crea el pedido a UN proveedor. El navegador sólo manda qué y cuánto: precio,
 * stock y disponibilidad salen siempre de la base.
 */
export async function placeOrder(input: {
  supplierId: string;
  items: { productId: string; qty: number }[];
  delivery: "PICKUP" | "DELIVERY";
  address: string;
  payMethod: string;
  note: string;
}): Promise<PlaceOrderResult> {
  const user = await requireUser();

  const supplier = await db.supplierProfile.findUnique({ where: { id: String(input.supplierId) } });
  if (!supplier || !supplier.visible) return { ok: false, error: "Este proveedor no está disponible." };
  if (supplier.userId === user.id) return { ok: false, error: "No podés hacerte un pedido a vos mismo." };

  const wanted = (Array.isArray(input.items) ? input.items : [])
    .map((i) => ({ productId: String(i.productId), qty: Math.round(Number(i.qty)) }))
    .filter((i) => i.qty >= 1 && i.qty <= 999)
    .slice(0, 50);
  if (wanted.length === 0) return { ok: false, error: "El pedido está vacío." };

  const products = await db.product.findMany({
    where: { id: { in: wanted.map((w) => w.productId) }, supplierId: supplier.id },
  });

  const items: OrderItem[] = [];
  for (const w of wanted) {
    const p = products.find((x) => x.id === w.productId);
    if (!p || !p.active || p.hidden) return { ok: false, error: "Un producto ya no está disponible. Revisá el carrito." };
    if (p.stock != null && w.qty > p.stock) {
      return { ok: false, error: `De «${p.name}» quedan ${p.stock}. Ajustá la cantidad.` };
    }
    items.push({ productId: p.id, name: p.name, price: p.price, qty: w.qty, unit: p.unit, image: parseList(p.images)[0] });
  }
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;

  if (supplier.minOrder && subtotal < supplier.minOrder) {
    return { ok: false, error: `El pedido mínimo de ${supplier.businessName} es ${formatMoney(supplier.minOrder)}.` };
  }
  const delivery = input.delivery === "DELIVERY" ? "DELIVERY" : "PICKUP";
  if (delivery === "DELIVERY" && !supplier.delivery) return { ok: false, error: "Este proveedor no hace envíos." };
  if (delivery === "PICKUP" && !supplier.pickup) return { ok: false, error: "Este proveedor no tiene retiro en el local." };
  const address = String(input.address ?? "").trim().slice(0, 200);
  if (delivery === "DELIVERY" && !address) return { ok: false, error: "Indicá la dirección de entrega." };

  const methods = parseList(supplier.payMethods);
  const payMethod = String(input.payMethod ?? "").trim();
  if (methods.length > 0 && !methods.includes(payMethod)) return { ok: false, error: "Elegí una forma de pago." };

  const order = await db.supplyOrder.create({
    data: {
      buyerId: user.id,
      supplierId: supplier.id,
      items: JSON.stringify(items),
      subtotal,
      delivery,
      address: delivery === "DELIVERY" ? address : "",
      payMethod,
      note: String(input.note ?? "").trim().slice(0, 500),
    },
  });

  after(() =>
    notify(supplier.userId, {
      title: `🛒 Pedido nuevo #${orderNumber(order.id)}`,
      body: `${user.name.split(" ")[0]} · ${items.length} ${items.length === 1 ? "producto" : "productos"} · ${formatMoney(subtotal)}`,
      url: `/proveedor/pedidos/${order.id}`,
    })
  );

  revalidatePath("/proveedor", "layout");
  return { ok: true, orderId: order.id };
}

/** El comprador cancela (mientras el proveedor no lo despachó). */
export async function cancelOrder(orderId: string): Promise<void> {
  const user = await requireUser();
  const order = await db.supplyOrder.findUnique({ where: { id: orderId }, include: { supplier: true } });
  if (!order || order.buyerId !== user.id) redirect("/materiales/pedidos");
  if (!["PENDING", "CONFIRMED"].includes(order.status)) redirect(`/materiales/pedidos/${orderId}`);

  await db.supplyOrder.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  if (order.stockApplied) await restoreStock(order.items);

  after(() =>
    notify(order.supplier.userId, {
      title: `Pedido #${orderNumber(order.id)} cancelado`,
      body: `${user.name.split(" ")[0]} canceló el pedido.`,
      url: `/proveedor/pedidos/${order.id}`,
    })
  );
  revalidatePath(`/materiales/pedidos/${orderId}`);
}

/** Reseña del proveedor, una vez entregado el pedido. */
export async function reviewSupplier(orderId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const order = await db.supplyOrder.findUnique({ where: { id: orderId }, include: { review: true } });
  if (!order || order.buyerId !== user.id || order.status !== "DELIVERED" || order.review) {
    redirect(`/materiales/pedidos/${orderId}`);
  }
  const stars = Math.round(Number(formData.get("stars")));
  if (!(stars >= 1 && stars <= 5)) redirect(`/materiales/pedidos/${orderId}?error=estrellas`);

  await db.supplierReview.create({
    data: { supplierId: order.supplierId, orderId, authorId: user.id, stars, comment: str(formData, "comment", 600) },
  });
  const agg = await db.supplierReview.aggregate({ where: { supplierId: order.supplierId }, _avg: { stars: true }, _count: true });
  await db.supplierProfile.update({
    where: { id: order.supplierId },
    data: { ratingAvg: agg._avg.stars ?? 0, ratingCount: agg._count },
  });

  revalidatePath(`/materiales/pedidos/${orderId}`);
  revalidatePath("/materiales", "layout");
}

/* ───────────────────────── Proveedor: gestión de pedidos ───────────────────────── */

async function myOrder(orderId: string) {
  const { profile } = await mySupplier();
  const order = await db.supplyOrder.findUnique({ where: { id: orderId } });
  if (!order || order.supplierId !== profile.id) redirect("/proveedor/pedidos");
  return { profile, order };
}

/** Devuelve al stock lo que un pedido había descontado. */
async function restoreStock(itemsJson: string): Promise<void> {
  for (const it of parseItems(itemsJson)) {
    await db.product.updateMany({ where: { id: it.productId, stock: { not: null } }, data: { stock: { increment: it.qty } } });
  }
}

/** Confirma: hay stock y este es el total final (con envío, si corresponde). */
export async function confirmOrder(orderId: string, formData: FormData): Promise<void> {
  const { order, profile } = await myOrder(orderId);
  if (order.status !== "PENDING") redirect(`/proveedor/pedidos/${orderId}`);

  const total = num(formData, "total");
  const note = str(formData, "supplierNote", 300);

  // Descuenta el stock de lo que lo controla (nunca por debajo de cero).
  for (const it of parseItems(order.items)) {
    const p = await db.product.findUnique({ where: { id: it.productId }, select: { stock: true } });
    if (p?.stock != null) {
      await db.product.update({ where: { id: it.productId }, data: { stock: Math.max(0, p.stock - it.qty) } });
    }
  }
  await db.supplyOrder.update({
    where: { id: orderId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      total: total != null && total > 0 ? Math.round(total * 100) / 100 : order.subtotal,
      supplierNote: note,
      stockApplied: true,
    },
  });

  after(() =>
    notify(order.buyerId, {
      title: `✅ ${profile.businessName} confirmó tu pedido`,
      body: note || `Pedido #${orderNumber(order.id)}`,
      url: `/materiales/pedidos/${orderId}`,
    })
  );
  revalidatePath(`/proveedor/pedidos/${orderId}`);
  revalidatePath("/proveedor", "layout");
}

export async function rejectOrder(orderId: string, formData: FormData): Promise<void> {
  const { order, profile } = await myOrder(orderId);
  if (order.status !== "PENDING") redirect(`/proveedor/pedidos/${orderId}`);
  const reason = str(formData, "supplierNote", 300);
  await db.supplyOrder.update({
    where: { id: orderId },
    data: { status: "REJECTED", cancelledAt: new Date(), supplierNote: reason },
  });
  after(() =>
    notify(order.buyerId, {
      title: `${profile.businessName} no pudo tomar tu pedido`,
      body: reason || "Podés pedirle a otro proveedor.",
      url: `/materiales/pedidos/${orderId}`,
    })
  );
  revalidatePath(`/proveedor/pedidos/${orderId}`);
  revalidatePath("/proveedor", "layout");
}

/** Avanza el pedido confirmado: listo para retirar / en camino / entregado. */
export async function advanceOrder(orderId: string, next: "READY" | "SHIPPED" | "DELIVERED"): Promise<void> {
  const { order, profile } = await myOrder(orderId);
  const allowed: Record<string, string[]> = {
    READY: ["CONFIRMED"],
    SHIPPED: ["CONFIRMED"],
    DELIVERED: ["CONFIRMED", "READY", "SHIPPED"],
  };
  if (!allowed[next]?.includes(order.status)) redirect(`/proveedor/pedidos/${orderId}`);
  if (next === "READY" && order.delivery !== "PICKUP") redirect(`/proveedor/pedidos/${orderId}`);
  if (next === "SHIPPED" && order.delivery !== "DELIVERY") redirect(`/proveedor/pedidos/${orderId}`);

  await db.supplyOrder.update({
    where: { id: orderId },
    data: { status: next, ...(next === "DELIVERED" ? { completedAt: new Date() } : {}) },
  });

  const title = {
    READY: `📦 Tu pedido está listo para retirar`,
    SHIPPED: `🚚 Tu pedido está en camino`,
    DELIVERED: `Pedido entregado: contanos cómo te fue`,
  }[next];
  after(() =>
    notify(order.buyerId, {
      title,
      body: `${profile.businessName} · #${orderNumber(order.id)}`,
      url: `/materiales/pedidos/${orderId}`,
    })
  );
  revalidatePath(`/proveedor/pedidos/${orderId}`);
  revalidatePath("/proveedor", "layout");
}
