"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" strokeLinejoin="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" />
    </svg>
  ),
  megaphone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" strokeLinejoin="round" />
      <path d="M15 9a4 4 0 0 1 0 6M18 7a7 7 0 0 1 0 10" strokeLinecap="round" />
    </svg>
  ),
  feed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 13h8M8 16.5h5" strokeLinecap="round" />
    </svg>
  ),
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

// Rutas de creación/configuración de perfil: la barra se oculta acá mientras
// el perfil todavía no está completo, para que el usuario termine el registro.
const ONBOARDING_ROUTES = ["/worker/profile"];

export function BottomNav({ items, onboarding = false }: { items: NavItem[]; onboarding?: boolean }) {
  const pathname = usePathname();

  if (onboarding && ONBOARDING_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[1000] bg-bg/95 backdrop-blur border-t border-line">
      <div className="mx-auto max-w-lg flex items-stretch justify-around">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/app" && pathname.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-1.5 text-[10px] font-medium transition whitespace-nowrap ${
                active ? "text-fg" : "text-faint hover:text-muted"
              }`}
            >
              {ICONS[it.icon]}
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
