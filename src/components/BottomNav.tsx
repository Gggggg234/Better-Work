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
      className="fixed bottom-0 inset-x-0 z-[1000] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pointer-events-none"
      aria-label="Navegación principal"
    >
      {/* Cápsula flotante: deja ver el contenido (o el mapa) alrededor */}
      <div
        className="pointer-events-auto mx-auto max-w-md grid glass border border-line/70 rounded-[26px] shadow-float px-1.5 py-1.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const isActive = active === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-[20px] text-[10.5px] font-bold transition ${
                isActive ? "text-accent" : "text-faint hover:text-fg"
              }`}
            >
              <span
                className={`flex items-center justify-center h-8 w-12 rounded-full transition-all duration-200 ${
                  isActive ? "bg-brand text-white shadow-glow scale-105" : ""
                }`}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.5 : 2} aria-hidden />
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
