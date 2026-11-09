import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeCheck, MapPin, MessageCircle, Phone, Star, Truck, Store, Clock, Wallet, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, timeAgo } from "@/lib/format";
import { openConversation } from "@/lib/actions/chat";
import { parseList, productCategory } from "@/lib/supplies";
import { BackButton } from "@/components/BackButton";
import { MapView } from "@/components/map/MapView";
import { ProductCard, SupplierLogo } from "@/components/supplies/Cards";
import { CartButton } from "@/components/supplies/CartButton";
import { SectionTitle } from "@/components/ui/ActionCards";

export default async function SupplierStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rubro?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;

  const s = await db.supplierProfile.findUnique({
    where: { id },
    include: {
      products: { where: { active: true, hidden: false }, orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" }, take: 20, include: { author: { select: { name: true } } } },
    },
  });
  const isOwner = s?.userId === me.id;
  if (!s || (!s.visible && !isOwner && me.role !== "ADMIN")) notFound();

  const rubros = [...new Set(s.products.map((p) => p.category))]
    .map((c) => productCategory(c))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const active = productCategory(sp.rubro ?? "")?.slug;
  const shown = active ? s.products.filter((p) => p.category === active) : s.products;
  const payMethods = parseList(s.payMethods);
  const place = [s.address, s.zone, s.city].filter(Boolean).join(", ");
  const chat = openConversation.bind(null, s.userId);
  const wa = s.whatsapp.replace(/\D/g, "");

  return (
    <main className="max-w-3xl mx-auto w-full px-4 py-5 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <BackButton fallback="/materiales" />
        <CartButton />
      </div>

      {/* Encabezado del comercio */}
      <section className="card p-5">
        <div className="flex items-start gap-4">
          <SupplierLogo name={s.businessName} url={s.logoUrl} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold tracking-tight truncate">{s.businessName}</h1>
              {s.verified && <BadgeCheck className="w-5 h-5 text-accent shrink-0" aria-label="Verificado" />}
            </div>
            <p className="text-sm text-muted flex items-center gap-1 mt-0.5 flex-wrap">
              {s.ratingCount > 0 ? (
                <>
                  <Star className="w-4 h-4 fill-warning text-warning" aria-hidden /> {s.ratingAvg.toFixed(1)} · {s.ratingCount}{" "}
                  {s.ratingCount === 1 ? "reseña" : "reseñas"}
                </>
              ) : (
                <span>Nuevo en Manobra</span>
              )}
            </p>
            {place && (
              <p className="text-sm text-muted flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden /> {place}
              </p>
            )}
          </div>
        </div>
        {s.description && <p className="text-sm text-muted mt-4 whitespace-pre-line">{s.description}</p>}

        {!isOwner && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <form action={chat} className="contents">
              <button className="btn-primary">
                <MessageCircle className="w-4 h-4" aria-hidden /> Mensaje
              </button>
            </form>
            {wa ? (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn-secondary">
                WhatsApp
              </a>
            ) : s.phone ? (
              <a href={`tel:${s.phone}`} className="btn-secondary">
                <Phone className="w-4 h-4" aria-hidden /> Llamar
              </a>
            ) : null}
          </div>
        )}
        {isOwner && (
          <Link href="/proveedor/perfil" className="btn-secondary w-full mt-4">Editar los datos del comercio</Link>
        )}
      </section>

      {/* Condiciones */}
      <section className="card divide-y divide-line text-sm">
        <Row icon={Store} label="Retiro en el local" value={s.pickup ? "Sí" : "No"} />
        <Row
          icon={Truck}
          label="Envío"
          value={s.delivery ? `Hasta ${s.deliveryRadiusKm} km${s.deliveryFee ? ` · ${s.deliveryFee}` : ""}` : "No hace envíos"}
        />
        {s.hours && <Row icon={Clock} label="Horario" value={s.hours} />}
        {payMethods.length > 0 && <Row icon={Wallet} label="Formas de pago" value={payMethods.join(", ")} />}
        {s.minOrder && <Row icon={ShoppingBag} label="Pedido mínimo" value={formatMoney(s.minOrder)} />}
      </section>

      {s.lat != null && s.lng != null && (
        <div className="h-44 rounded-2xl overflow-hidden border border-line">
          <MapView
            center={[s.lat, s.lng]}
            zoom={15}
            markers={[{ id: s.id, lat: s.lat, lng: s.lng, label: s.businessName, kind: "company" }]}
          />
        </div>
      )}

      {/* Productos */}
      <section>
        <SectionTitle title={`Productos (${s.products.length})`} />
        {rubros.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 [scrollbar-width:none]">
            <Link href={`/materiales/proveedor/${s.id}`} className={`chip !py-1 ${!active ? "chip-active" : ""}`}>Todos</Link>
            {rubros.map((c) => (
              <Link
                key={c.slug}
                href={`/materiales/proveedor/${s.id}?rubro=${c.slug}`}
                className={`chip !py-1 ${active === c.slug ? "chip-active" : ""}`}
              >
                <c.icon className="w-4 h-4" aria-hidden /> {c.name}
              </Link>
            ))}
          </div>
        )}
        {shown.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {shown.map((p) => (
              <ProductCard key={p.id} p={{ ...p, supplierName: s.businessName }} />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-muted">Todavía no publicó productos.</div>
        )}
      </section>

      {/* Reseñas */}
      <section>
        <SectionTitle title="Reseñas" />
        <div className="card divide-y divide-line">
          {s.reviews.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{r.author.name.split(/\s+/)[0]}</p>
                <span className="text-xs text-faint">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-sm text-warning mt-0.5" aria-label={`${r.stars} de 5`}>
                {"★".repeat(r.stars)}
                <span className="text-line">{"★".repeat(5 - r.stars)}</span>
              </p>
              {r.comment && <p className="text-sm text-muted mt-1">{r.comment}</p>}
            </div>
          ))}
          {s.reviews.length === 0 && (
            <p className="p-5 text-center text-sm text-muted">Todavía no tiene reseñas. Se dejan después de cada pedido entregado.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="p-3.5 flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted mt-0.5 shrink-0" aria-hidden />
      <span className="text-muted w-32 shrink-0">{label}</span>
      <span className="font-medium flex-1 text-right">{value}</span>
    </div>
  );
}
