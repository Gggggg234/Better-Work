"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Search,
  Package,
  Briefcase,
  User,
  ClipboardList,
  Building2,
  Users,
  Store,
  Boxes,
  Receipt,
  Shield,
  MessageCircle,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  home: House,
  search: Search,
  materials: Package,
  briefcase: Briefcase,
  user: User,
  requests: ClipboardList,
  building: Building2,
  feed: Users,
  store: Store,
  products: Boxes,
  orders: Receipt,
  admin: Shield,
  chat: MessageCircle,
  megaphone: Megaphone,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

// Rutas de creación/configuración de perfil: la barra se oculta acá mientras
// el perfil todavía no está completo, para que el usuario termine el registro.
const ONBOARDING_ROUTES = ["/worker/profile"];

export function BottomNav({ items, onboarding = false }: { items: NavItem[]; onboarding?: boolean }) {
  const pathname = usePathname();

  if (onboarding && ONBOARDING_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return null;
  }

  // La sección activa es la de prefijo más largo (así /proveedor/productos no
  // marca también /proveedor).
  const active = items
    .filter((it) => pathname === it.href || (it.href !== "/app" && pathname.startsWith(`${it.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[1000] bg-surface/90 backdrop-blur-lg border-t border-line pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal"
    >
      <div className="mx-auto max-w-lg grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const isActive = active === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-1 pt-2 pb-2.5 text-[11px] font-medium transition ${
                isActive ? "text-fg" : "text-faint hover:text-muted"
              }`}
            >
              <span
                className={`flex items-center justify-center h-7 w-12 rounded-full transition ${
                  isActive ? "bg-accent/12 text-accent" : ""
                }`}
              >
                <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
