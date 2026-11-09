import Link from "next/link";
import { BadgeCheck, MapPin, Star, Truck, Store as StoreIcon, Package } from "lucide-react";
import { formatMoney, toneBadge } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { discountPct, isOnSale, parseList, productCategory, stockLabel } from "@/lib/supplies";

export type ProductCardData = {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  unit: string;
  stock: number | null;
  category: string;
  images: string;
  supplierName: string;
  distanceKm?: number | null;
};

/** Foto del producto o, si no tiene, el ícono de su rubro. */
export function ProductImage({ images, category, className = "" }: { images: string; category: string; className?: string }) {
  const src = parseList(images)[0];
  const Icon = productCategory(category)?.icon ?? Package;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" decoding="async" className={`object-cover bg-surface-2 ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-surface-2 text-faint ${className}`}>
      <Icon className="w-1/3 h-1/3" aria-hidden />
    </div>
  );
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const sale = isOnSale(p);
  const stock = stockLabel(p.stock);
  return (
    <Link href={`/materiales/p/${p.id}`} className="card overflow-hidden flex flex-col hover:-translate-y-0.5 hover:border-fg/20 transition">
      <div className="relative">
        <ProductImage images={p.images} category={p.category} className="w-full aspect-square" />
        {sale && <span className="absolute top-2 left-2 badge bg-fg text-bg">-{discountPct(p)}%</span>}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium leading-snug line-clamp-2">{p.name}</p>
        <div className="mt-auto pt-1">
          {sale && <p className="text-[11px] text-faint line-through">{formatMoney(p.compareAtPrice!)}</p>}
          <p className="font-bold">
            {formatMoney(p.price)}
            <span className="text-[11px] font-normal text-muted"> / {p.unit}</span>
          </p>
          <p className="text-[11px] text-muted truncate mt-0.5">
            {p.supplierName}
            {p.distanceKm != null && ` · ${formatKm(p.distanceKm)}`}
          </p>
          {stock.tone !== "success" && stock.tone !== "neutral" && (
            <span className={`${toneBadge(stock.tone)} mt-1`}>{stock.text}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export type SupplierCardData = {
  id: string;
  businessName: string;
  logoUrl: string | null;
  zone: string;
  city: string;
  ratingAvg: number;
  ratingCount: number;
  verified: boolean;
  pickup: boolean;
  delivery: boolean;
  distanceKm?: number | null;
  productCount?: number;
};

export function SupplierLogo({ name, url, size = 48 }: { name: string; url: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="rounded-xl object-cover shrink-0 bg-surface-2" style={{ width: size, height: size }} />
  ) : (
    <span
      className="rounded-xl bg-success/12 text-success font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function SupplierCard({ s }: { s: SupplierCardData }) {
  const place = [s.zone, s.city].filter(Boolean).join(", ");
  return (
    <Link href={`/materiales/proveedor/${s.id}`} className="card p-4 flex items-center gap-3.5 hover:border-fg/20 transition">
      <SupplierLogo name={s.businessName} url={s.logoUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate">{s.businessName}</p>
          {s.verified && <BadgeCheck className="w-4 h-4 text-accent shrink-0" aria-label="Verificado" />}
        </div>
        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
          {s.ratingCount > 0 && (
            <>
              <Star className="w-3.5 h-3.5 fill-warning text-warning" aria-hidden /> {s.ratingAvg.toFixed(1)} ({s.ratingCount}) ·
            </>
          )}
          {place && (
            <span className="inline-flex items-center gap-0.5 truncate">
              <MapPin className="w-3.5 h-3.5" aria-hidden /> {place}
            </span>
          )}
          {s.distanceKm != null && <span>· {formatKm(s.distanceKm)}</span>}
        </p>
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {s.delivery && (
            <span className="badge badge-accent">
              <Truck className="w-3 h-3" aria-hidden /> Envío
            </span>
          )}
          {s.pickup && (
            <span className="badge badge-neutral">
              <StoreIcon className="w-3 h-3" aria-hidden /> Retiro
            </span>
          )}
          {s.productCount != null && <span className="badge badge-neutral">{s.productCount} productos</span>}
        </div>
      </div>
    </Link>
  );
}
