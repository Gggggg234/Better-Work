import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BottomNav, type NavItem } from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";

/**
 * Menú inferior: 5 secciones por rol, lo que más se usa. Mensajes y
 * notificaciones viven en la barra superior; Comunidad y Empleos, en el inicio
 * y el perfil.
 */
const NAV: Record<string, NavItem[]> = {
  CLIENT: [
    { href: "/app", label: "Inicio", icon: "home" },
    { href: "/search", label: "Buscar", icon: "search" },
    { href: "/materiales", label: "Materiales", icon: "materials" },
    { href: "/jobs", label: "Trabajos", icon: "briefcase" },
    { href: "/profile", label: "Perfil", icon: "user" },
  ],
  WORKER: [
    { href: "/app", label: "Inicio", icon: "home" },
    { href: "/pedidos", label: "Pedidos", icon: "requests" },
    { href: "/materiales", label: "Materiales", icon: "materials" },
    { href: "/jobs", label: "Trabajos", icon: "briefcase" },
    { href: "/profile", label: "Perfil", icon: "user" },
  ],
  COMPANY: [
    { href: "/app", label: "Inicio", icon: "home" },
    { href: "/company", label: "Empresa", icon: "building" },
    { href: "/materiales", label: "Materiales", icon: "materials" },
    { href: "/feed", label: "Comunidad", icon: "feed" },
    { href: "/profile", label: "Perfil", icon: "user" },
  ],
  SUPPLIER: [
    { href: "/proveedor", label: "Panel", icon: "store" },
    { href: "/proveedor/productos", label: "Productos", icon: "products" },
    { href: "/proveedor/pedidos", label: "Pedidos", icon: "orders" },
    { href: "/materiales", label: "Tienda", icon: "materials" },
    { href: "/profile", label: "Perfil", icon: "user" },
  ],
  ADMIN: [
    { href: "/app", label: "Inicio", icon: "home" },
    { href: "/feed", label: "Comunidad", icon: "feed" },
    { href: "/admin", label: "Admin", icon: "admin" },
    { href: "/materiales", label: "Materiales", icon: "materials" },
    { href: "/profile", label: "Perfil", icon: "user" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Cuenta creada con Google que todavía no eligió rol: termina el alta primero.
  if (!user.onboarded) redirect("/onboarding");

  // Un trabajador todavía está creando su perfil mientras no cargó una profesión
  // real. Durante ese onboarding se oculta la barra inferior (ver BottomNav).
  const onboarding =
    user.role === "WORKER" &&
    (!user.workerProfile ||
      !user.workerProfile.profession ||
      user.workerProfile.profession === "Sin definir");

  // Completar el perfil profesional es OBLIGATORIO: mientras esté incompleto, el
  // trabajador queda en /worker/profile y no puede navegar el resto de la app.
  if (onboarding) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (!pathname.startsWith("/worker/profile")) redirect("/worker/profile");
  }

  return (
    <div className="min-h-screen flex flex-col pb-[72px]">
      {!onboarding && <AppHeader userId={user.id} />}
      <div className="flex-1 flex flex-col">{children}</div>
      <BottomNav items={NAV[user.role] ?? NAV.CLIENT} onboarding={onboarding} />
    </div>
  );
}
