import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

const TABS: [string, string][] = [
  ["/admin", "Resumen"],
  ["/admin/users", "Usuarios"],
  ["/admin/posts", "Feed"],
  ["/admin/categories", "Categorías"],
  ["/admin/reports", "Denuncias"],
  ["/admin/revenue", "Ingresos"],
  ["/admin/settings", "Ajustes"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="bg-fg text-bg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Better Work" className="w-8 h-8 rounded-[22%] object-cover" />
            <div>
              <p className="font-bold leading-tight">Better Work</p>
              <p className="text-xs text-bg/50">Panel administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-xs text-bg/70 hover:text-bg transition">Ver app →</Link>
            <form action={logout}>
              <button className="text-xs text-bg/70 hover:text-bg transition">Salir</button>
            </form>
          </div>
        </div>
        <nav className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="px-3.5 py-2.5 text-sm text-bg/60 hover:text-bg transition whitespace-nowrap border-b-2 border-transparent hover:border-white"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
