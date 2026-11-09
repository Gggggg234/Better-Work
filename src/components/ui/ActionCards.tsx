import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type ActionTone = "accent" | "success" | "warning" | "neutral";

const TILE: Record<ActionTone, string> = {
  accent: "bg-brand text-brand-fg shadow-glow",
  success: "bg-brand text-brand-fg shadow-glow",
  warning: "bg-brand text-brand-fg shadow-glow",
  neutral: "bg-surface-2 text-fg",
};

/** Ícono dentro de un cuadrado redondeado de color suave. */
export function IconTile({ icon: Icon, tone = "neutral", size = "md" }: { icon: LucideIcon; tone?: ActionTone; size?: "sm" | "md" }) {
  const box = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  const ico = size === "sm" ? "w-[18px] h-[18px]" : "w-[22px] h-[22px]";
  return (
    <span className={`icon-tile ${box} ${TILE[tone]}`}>
      <Icon className={ico} aria-hidden />
    </span>
  );
}

/**
 * Acceso rápido en grilla: ícono + qué es + para qué sirve. La línea de
 * explicación es lo que hace que la app se entienda sin manual.
 */
export function QuickAction({
  href,
  icon,
  title,
  desc,
  tone = "accent",
  badge,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tone?: ActionTone;
  badge?: number;
}) {
  return (
    <Link href={href} className="card card-hover p-4 flex flex-col gap-3.5 relative overflow-hidden">
      <IconTile icon={icon} tone={tone} />
      <div>
        <p className="font-bold text-[15px] leading-tight">{title}</p>
        <p className="text-xs text-muted mt-1 leading-snug">{desc}</p>
      </div>
      {!!badge && badge > 0 && (
        <span className="absolute top-3 right-3 min-w-6 h-6 px-1.5 rounded-full bg-fg text-bg text-xs font-bold leading-6 text-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

/** Fila de acceso: ícono + título + explicación + flecha. */
export function ActionRow({
  href,
  icon,
  title,
  desc,
  tone = "neutral",
  highlight = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tone?: ActionTone;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card card-hover p-4 flex items-center gap-3.5 ${highlight ? "!border-accent/40 bg-accent/[0.04]" : ""}`}
    >
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-faint shrink-0" aria-hidden />
    </Link>
  );
}

/** Título de sección con acción opcional a la derecha. */
export function SectionTitle({ title, href, linkLabel = "Ver todo" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-extrabold text-lg tracking-tight">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-bold text-accent hover:underline inline-flex items-center gap-0.5">
          {linkLabel}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/**
 * Encabezado de pantalla con el degradé de marca. El contenido que sigue puede
 * montarse encima con un margen negativo (`-mt-8`) para el efecto de tarjeta.
 */
export function PageHero({
  title,
  subtitle,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden bg-hero text-white ${className}`}>
      <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative max-w-3xl mx-auto px-5 pt-7 pb-12">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">{eyebrow}</p>}
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-white/80 mt-1.5 max-w-md">{subtitle}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  );
}
