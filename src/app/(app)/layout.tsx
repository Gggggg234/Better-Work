import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BottomNav, type NavItem } from "@/components/BottomNav";

const NAV: Record<string, NavItem[]> = {
  CLIENT: [
    { href: "/app", label: "Inicio", icon: "home" },
    { href: "/search", label: "Buscar", icon: "search" },
    { href: "/feed", label: "Comunidad", icon: "feed" },
    { href: "/jobs", label: "Trabajos", icon: "briefcase" },
    { href: "/chat", label: "Chat", icon: "chat" },
    { href: "/profile", label: "Perfil", icon: "user" },
  ],
  WORKER: [
    { href: "/app", label: "Inicio", icon: "home" },
    { href: "/feed", label: "Comunidad", icon: "feed" },
    { href: "/jobs", label: "Trabajos", icon: "briefcase" },
    { href: "/offers", label: "Empleos", icon: "megaphone" },
    { href: "/chat", label: "Chat", icon: "chat" },
    { href: "/profile", label: "Perfil", icon: "user" },
  ],
  COMPANY: [
    { href: "/app", label: "Inicio", icon: "home" },
    { href: "/feed", label: "Comunidad", icon: "feed" },
    { href: "/company", label: "Empresa", icon: "building" },
    { href: "/chat", label: "Chat", icon: "chat" },
    { href: "/profile", label: "Perfil", icon: "user" },
  ],
  ADMIN: [
    { href: "/app", label: "Inicio", icon: "home" },
    { href: "/feed", label: "Comunidad", icon: "feed" },
    { href: "/admin", label: "Admin", icon: "building" },
    { href: "/chat", label: "Chat", icon: "chat" },
    { href: "/profile", label: "Perfil", icon: "user" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Un trabajador todavía está creando su perfil mientras no cargó una profesión
  // real. Durante ese onboarding se oculta la barra inferior (ver BottomNav).
  const onboarding =
    user.role === "WORKER" &&
    (!user.workerProfile ||
      !user.workerProfile.profession ||
      user.workerProfile.profession === "Sin definir");

  return (
    <div className="min-h-screen flex flex-col pb-[60px]">
      <div className="flex-1 flex flex-col">{children}</div>
      <BottomNav items={NAV[user.role] ?? NAV.CLIENT} onboarding={onboarding} />
    </div>
  );
}
