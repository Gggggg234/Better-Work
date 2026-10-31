import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type ActionTone = "accent" | "success" | "warning" | "neutral";

const TILE: Record<ActionTone, string> = {
  accent: "bg-accent/12 text-accent",
  success: "bg-success/12 text-success",
  warning: "bg-warning/14 text-warning",
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
    <Link href={href} className="card p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:border-fg/20 transition relative">
      <IconTile icon={icon} tone={tone} />
      <div>
        <p className="font-semibold text-sm leading-tight">{title}</p>
        <p className="text-xs text-muted mt-1 leading-snug">{desc}</p>
      </div>
      {!!badge && badge > 0 && (
        <span className="absolute top-3 right-3 min-w-6 h-6 px-1.5 rounded-full bg-danger text-white text-xs font-bold leading-6 text-center">
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
      className={`card p-4 flex items-center gap-3.5 transition hover:border-fg/20 ${highlight ? "!border-accent/40 bg-accent/5" : ""}`}
    >
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm">{title}</p>
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
      <h2 className="font-bold text-lg tracking-tight">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-medium text-accent hover:underline inline-flex items-center gap-0.5">
          {linkLabel}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
