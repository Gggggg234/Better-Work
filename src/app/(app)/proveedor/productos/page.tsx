import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Plus, Search, Pencil, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, toneBadge } from "@/lib/format";
import { toggleProductActive, updateStock } from "@/lib/actions/supplies";
import { isOnSale, productCategory, stockLabel } from "@/lib/supplies";
import { ProductImage } from "@/components/supplies/Cards";

const FILTERS: Record<string, string> = { todos: "Todos", activos: "Publicados", pausados: "Pausados", sinstock: "Sin stock" };

export default async function SupplierProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; ok?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me?.supplierProfile) redirect("/proveedor");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const estado = FILTERS[sp.estado ?? ""] ? sp.estado! : "todos";

  const where: Prisma.ProductWhereInput = {
    supplierId: me.supplierProfile.id,
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(estado === "activos" ? { active: true } : estado === "pausados" ? { active: false } : estado === "sinstock" ? { stock: 0 } : {}),
  };
  const products = await db.product.findMany({ where, orderBy: { updatedAt: "desc" }, take: 200 });

  return (
    <main className="max-w-3xl mx-auto w-full px-4 py-5 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="text-sm text-muted mt-0.5">Tu catálogo: precios, stock y fotos.</p>
        </div>
        <Link href="/proveedor/productos/nuevo" className="btn-accent">
          <Plus className="w-4 h-4" aria-hidden /> Nuevo
        </Link>
      </div>

      {sp.ok && (
        <div className="card p-4 flex items-center gap-3 !border-success/40 bg-success/5">
          <CheckCircle2 className="w-5 h-5 text-success" aria-hidden />
          <p className="text-sm font-medium">{sp.ok === "borrado" ? "Producto borrado." : "Producto guardado."}</p>
        </div>
      )}

      <form action="/proveedor/productos" className="flex items-center gap-2.5 card px-4">
        <Search className="w-[18px] h-[18px] text-faint" aria-hidden />
        <input name="q" defaultValue={q} placeholder="Buscar en tus productos" className="w-full py-3 text-sm bg-transparent outline-none" />
        {estado !== "todos" && <input type="hidden" name="estado" value={estado} />}
      </form>

      <div className="flex gap-2 overflow-x-auto">
        {Object.entries(FILTERS).map(([k, label]) => (
          <Link
            key={k}
            href={`/proveedor/productos?estado=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`chip !py-1 ${estado === k ? "chip-active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="space-y-2.5">
        {products.map((p) => {
          const st = stockLabel(p.stock);
          return (
            <div key={p.id} className={`card p-3.5 flex gap-3 ${p.active ? "" : "opacity-70"}`}>
              <ProductImage images={p.images} category={p.category} className="w-16 h-16 rounded-xl shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug line-clamp-2">{p.name}</p>
                  <Link href={`/proveedor/productos/${p.id}`} className="p-1.5 text-muted hover:text-fg shrink-0" aria-label={`Editar ${p.name}`}>
                    <Pencil className="w-4 h-4" />
                  </Link>
                </div>
                <p className="text-xs text-muted">
                  {formatMoney(p.price)} / {p.unit} · {productCategory(p.category)?.name ?? p.category}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {!p.active && <span className="badge badge-neutral">Pausado</span>}
                  {p.hidden && <span className="badge badge-danger">Oculto por moderación</span>}
                  {isOnSale(p) && <span className="badge badge-danger">Oferta</span>}
                  <span className={toneBadge(st.tone)}>{st.text}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <form action={updateStock.bind(null, p.id)} className="flex items-center gap-1.5">
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={p.stock ?? ""}
                      placeholder="Stock"
                      aria-label={`Stock de ${p.name}`}
                      className="input !w-20 !py-1.5 !px-2 !text-xs"
                    />
                    <button className="btn-secondary !py-1.5 !px-2.5 !text-xs">Guardar</button>
                  </form>
                  <form action={toggleProductActive.bind(null, p.id)} className="ml-auto">
                    <button className="btn-ghost !py-1.5 !px-2.5 !text-xs">
                      {p.active ? <EyeOff className="w-3.5 h-3.5" aria-hidden /> : <Eye className="w-3.5 h-3.5" aria-hidden />}
                      {p.active ? "Pausar" : "Publicar"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
        {products.length === 0 && (
          <div className="card p-8 text-center">
            <p className="font-semibold">{q || estado !== "todos" ? "No hay productos con ese filtro" : "Todavía no cargaste productos"}</p>
            <p className="text-sm text-muted mt-1">Cargá tus productos con foto, precio y stock para empezar a vender.</p>
            <Link href="/proveedor/productos/nuevo" className="btn-accent mt-4 inline-flex">
              <Plus className="w-4 h-4" aria-hidden /> Cargar producto
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
