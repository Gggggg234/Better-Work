import Link from "next/link";
import { CartButton } from "./CartButton";

/** Cabecera de la sección Materiales: título, carrito y pestañas. */
export function MaterialsHeader({ tab, title, subtitle }: { tab: "explorar" | "pedidos" | "carrito"; title?: string; subtitle?: string }) {
  const tabs = [
    { key: "explorar", href: "/materiales", label: "Explorar" },
    { key: "pedidos", href: "/materiales/pedidos", label: "Mis pedidos" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title ?? "Materiales"}</h1>
          <p className="text-sm text-muted mt-0.5">
            {subtitle ?? "Comprá en corralones, ferreterías y casas de sanitarios cerca tuyo."}
          </p>
        </div>
        <CartButton />
      </div>
      <nav className="flex gap-1 p-1 rounded-xl bg-surface-2 w-fit" aria-label="Secciones de materiales">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
