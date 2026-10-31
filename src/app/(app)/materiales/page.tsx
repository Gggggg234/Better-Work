import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Search, Truck, Percent, Store, LayoutGrid } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { distanceKm } from "@/lib/geo";
import { PRODUCT_CATEGORIES, isOnSale, productCategory } from "@/lib/supplies";
import { MaterialsHeader } from "@/components/supplies/MaterialsHeader";
import { ProductCard, SupplierCard, type ProductCardData } from "@/components/supplies/Cards";
import { SectionTitle } from "@/components/ui/ActionCards";

type SP = { q?: string; rubro?: string; envio?: string; oferta?: string; orden?: string };

const SORTS: Record<string, string> = {
  nuevos: "Más nuevos",
  precio: "Menor precio",
  "precio-desc": "Mayor precio",
  cerca: "Más cerca",
};

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim().slice(0, 80);
  const rubro = productCategory(sp.rubro ?? "")?.slug ?? "";
  const envio = sp.envio === "1";
  const oferta = sp.oferta === "1";
  const orden = SORTS[sp.orden ?? ""] ? sp.orden! : "nuevos";
  const browsing = !q && !rubro && !envio && !oferta;

  // Ubicación de quien compra (profesional o empresa) para ordenar por cercanía.
  const here =
    me.workerProfile?.lat != null && me.workerProfile.lng != null
      ? { lat: me.workerProfile.lat, lng: me.workerProfile.lng }
      : me.companyProfile?.lat != null && me.companyProfile.lng != null
        ? { lat: me.companyProfile.lat, lng: me.companyProfile.lng }
        : null;
  const dist = (s: { lat: number | null; lng: number | null }) =>
    here && s.lat != null && s.lng != null ? distanceKm(here.lat, here.lng, s.lat, s.lng) : null;

  const supplierWhere: Prisma.SupplierProfileWhereInput = {
    visible: true,
    user: { suspended: false },
    ...(envio ? { delivery: true } : {}),
  };
  const where: Prisma.ProductWhereInput = {
    active: true,
    hidden: false,
    supplier: supplierWhere,
    ...(rubro ? { category: rubro } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, suppliers] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: orden === "precio" ? { price: "asc" } : orden === "precio-desc" ? { price: "desc" } : { createdAt: "desc" },
      take: 200,
      include: { supplier: { select: { businessName: true, lat: true, lng: true } } },
    }),
    browsing
      ? db.supplierProfile.findMany({
          where: supplierWhere,
          include: { _count: { select: { products: { where: { active: true, hidden: false } } } } },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  let products = rows.map(
    (p): ProductCardData => ({
      id: p.id,
      name: p.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      unit: p.unit,
      stock: p.stock,
      category: p.category,
      images: p.images,
      supplierName: p.supplier.businessName,
      distanceKm: dist(p.supplier),
    })
  );
  if (oferta) products = products.filter(isOnSale);
  if (orden === "cerca") products.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));

  const nearSuppliers = suppliers
    .filter((s) => s._count.products > 0)
    .map((s) => ({ ...s, distanceKm: dist(s) }))
    .sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) || b.ratingAvg - a.ratingAvg)
    .slice(0, 6);
  const onSale = products.filter(isOnSale).slice(0, 6);

  // Enlaces de filtro que conservan el resto de los parámetros.
  const href = (patch: Partial<SP>) => {
    const next = { q, rubro, envio: envio ? "1" : "", oferta: oferta ? "1" : "", orden: orden === "nuevos" ? "" : orden, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return `/materiales${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="max-w-3xl mx-auto w-full px-4 py-5 space-y-6 animate-fade-up">
      <MaterialsHeader tab="explorar" />

      {me.role === "SUPPLIER" && (
        <Link href="/proveedor" className="card p-4 flex items-center gap-3 !border-accent/40 bg-accent/5">
          <Store className="w-5 h-5 text-accent" aria-hidden />
          <p className="text-sm">Así ven los compradores el catálogo. <span className="font-semibold text-accent">Ir a mi panel →</span></p>
        </Link>
      )}

      {/* Buscador */}
      <form action="/materiales" className="flex items-center gap-2.5 card px-4">
        <Search className="w-[18px] h-[18px] text-faint shrink-0" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscá un producto: caño, cemento, cable…"
          aria-label="Buscar productos"
          className="w-full py-3.5 text-sm bg-transparent outline-none placeholder:text-faint"
        />
        {rubro && <input type="hidden" name="rubro" value={rubro} />}
        {envio && <input type="hidden" name="envio" value="1" />}
        {oferta && <input type="hidden" name="oferta" value="1" />}
      </form>

      {/* Rubros */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link href={href({ rubro: "" })} className={`chip ${!rubro ? "chip-active" : ""}`}>
          <LayoutGrid className="w-4 h-4" aria-hidden /> Todos
        </Link>
        {PRODUCT_CATEGORIES.map((c) => (
          <Link key={c.slug} href={href({ rubro: c.slug })} className={`chip ${rubro === c.slug ? "chip-active" : ""}`}>
            <c.icon className="w-4 h-4" aria-hidden /> {c.name}
          </Link>
        ))}
      </div>

      {/* Filtros y orden */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href({ envio: envio ? "" : "1" })} className={`chip !py-1 ${envio ? "chip-active" : ""}`}>
          <Truck className="w-4 h-4" aria-hidden /> Con envío
        </Link>
        <Link href={href({ oferta: oferta ? "" : "1" })} className={`chip !py-1 ${oferta ? "chip-active" : ""}`}>
          <Percent className="w-4 h-4" aria-hidden /> En oferta
        </Link>
        <div className="flex gap-1 ml-auto text-xs">
          {Object.entries(SORTS)
            .filter(([k]) => k !== "cerca" || here)
            .map(([k, label]) => (
              <Link
                key={k}
                href={href({ orden: k === "nuevos" ? "" : k })}
                className={`px-2.5 py-1 rounded-lg ${orden === k ? "bg-fg text-bg font-semibold" : "text-muted hover:text-fg"}`}
              >
                {label}
              </Link>
            ))}
        </div>
      </div>

      {browsing ? (
        <>
          {onSale.length > 0 && (
            <section>
              <SectionTitle title="🔥 Ofertas" href={href({ oferta: "1" })} linkLabel="Ver todas" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {onSale.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            </section>
          )}

          {nearSuppliers.length > 0 && (
            <section>
              <SectionTitle title={here ? "Proveedores cerca tuyo" : "Proveedores"} />
              <div className="grid sm:grid-cols-2 gap-2.5">
                {nearSuppliers.map((s) => (
                  <SupplierCard key={s.id} s={{ ...s, productCount: s._count.products }} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle title="Productos" />
            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.slice(0, 30).map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            ) : (
              <EmptyCatalog />
            )}
          </section>
        </>
      ) : (
        <section>
          <p className="text-sm text-muted mb-3">
            {products.length} {products.length === 1 ? "producto" : "productos"}
            {rubro && ` en ${productCategory(rubro)?.name.toLowerCase()}`}
            {q && ` para «${q}»`}
          </p>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.slice(0, 60).map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="font-semibold">No encontramos productos</p>
              <p className="text-sm text-muted mt-1">Probá con otra palabra o sacá algún filtro.</p>
              <Link href="/materiales" className="btn-secondary mt-4 inline-flex">Ver todo</Link>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

/** Todavía no hay catálogo: invita a sumarse a los comercios. */
function EmptyCatalog() {
  return (
    <div className="card p-8 text-center">
      <span className="icon-tile w-14 h-14 bg-success/12 text-success mx-auto">
        <Store className="w-7 h-7" aria-hidden />
      </span>
      <p className="font-semibold mt-4">Todavía no hay proveedores en tu zona</p>
      <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
        Estamos sumando corralones, ferreterías y casas de sanitarios. ¿Tenés un comercio? Vendé tus productos a
        profesionales y clientes de tu zona.
      </p>
      <Link href="/register?rol=proveedor" className="btn-primary mt-4 inline-flex">Quiero vender en Better Work</Link>
    </div>
  );
}
