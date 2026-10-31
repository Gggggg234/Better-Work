import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Pencil,
  Eye,
  BarChart3,
  Megaphone,
  Briefcase,
  Building2,
  Gauge,
  CreditCard,
  Shield,
  Newspaper,
  ClipboardList,
  MessageCircle,
  Bell,
  Gift,
  Package,
  Sparkles,
  ChevronRight,
  LogOut,
  Star,
  Store,
  type LucideIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { updateAvatar, updatePayPreference } from "@/lib/actions/profile";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallButton } from "@/components/InstallButton";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { rankBreakdown } from "@/lib/rank";
import { isPro } from "@/lib/pro";
import { formatDate } from "@/lib/format";
import { ProgressBar } from "@/components/charts/Charts";
import { PAY_PREFERENCE_OPTIONS } from "@/lib/payments/types";

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Cliente",
  WORKER: "Profesional",
  COMPANY: "Empresa",
  SUPPLIER: "Proveedor",
  ADMIN: "Administrador",
};

type MenuItem = { href: string; label: string; icon: LucideIcon; hint?: string };

function Menu({ title, items }: { title: string; items: MenuItem[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint px-1 mb-2">{title}</h2>
      <div className="card overflow-hidden divide-y divide-line">
        {items.map((it) => (
          <Link key={it.href + it.label} href={it.href} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-2 transition">
            <span className="icon-tile w-9 h-9 bg-surface-2 text-fg">
              <it.icon className="w-[18px] h-[18px]" aria-hidden />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold">{it.label}</span>
              {it.hint && <span className="block text-xs text-muted truncate">{it.hint}</span>}
            </span>
            <ChevronRight className="w-4 h-4 text-faint" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const work: MenuItem[] = [];
  if (me.role === "WORKER") {
    work.push({ href: "/worker/profile", label: "Editar perfil profesional", icon: Pencil, hint: "Oficio, zona, horarios, fotos" });
    work.push({ href: `/w/${me.id}`, label: "Ver mi perfil público", icon: Eye, hint: "Así te ven los clientes" });
    work.push({ href: "/dashboard", label: "Mi rendimiento", icon: BarChart3 });
    work.push({ href: "/ads", label: "Publicidad", icon: Megaphone, hint: "Aparecé primero en tu zona" });
    work.push({ href: "/offers", label: "Ofertas de empleo", icon: Briefcase });
  }
  if (me.role === "COMPANY") {
    work.push({ href: "/company", label: "Panel de empresa", icon: Building2 });
    work.push({ href: "/company/dashboard", label: "Métricas", icon: Gauge });
    work.push({ href: "/company/plan", label: "Mi plan", icon: CreditCard, hint: "Membresía y pagos" });
    work.push({ href: "/ads", label: "Publicidad", icon: Megaphone });
  }
  if (me.role === "SUPPLIER") {
    work.push({ href: "/proveedor", label: "Panel del comercio", icon: Store });
    work.push({ href: "/proveedor/perfil", label: "Datos del comercio", icon: Pencil });
  }
  if (me.role === "ADMIN") work.push({ href: "/admin", label: "Panel administrativo", icon: Shield });

  const activity: MenuItem[] = [
    { href: "/jobs", label: "Mis trabajos", icon: ClipboardList },
    { href: "/materiales/pedidos", label: "Mis compras de materiales", icon: Package },
    { href: "/chat", label: "Mensajes", icon: MessageCircle },
    { href: "/notificaciones", label: "Notificaciones", icon: Bell },
    { href: `/feed/user/${me.id}`, label: "Mis publicaciones", icon: Newspaper },
    { href: "/invitar", label: "Invitá y ganá", icon: Gift, hint: "Sumá amigos y colegas" },
  ];

  const wp = me.workerProfile;
  const pro = isPro(wp?.proUntil);
  const payPreference: string[] = (() => {
    try {
      return JSON.parse(me.payPreference || "[]");
    } catch {
      return [];
    }
  })();
  const r = wp
    ? rankBreakdown({
        ratingAvg: wp.ratingAvg,
        ratingCount: wp.ratingCount,
        jobsDone: wp.jobsDone,
        createdAt: wp.createdAt,
        cancellations: wp.cancellations,
        claims: wp.claims,
        avgResponseMins: wp.avgResponseMins,
        punctualityAvg: wp.punctualityAvg,
      })
    : null;

  return (
    <main className="w-full animate-fade-up">
      {/* Encabezado */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
        <div className="relative max-w-lg mx-auto px-5 pt-8 pb-20 flex flex-col items-center text-center">
          <div className="rounded-full p-1 bg-white/20 backdrop-blur">
            <AvatarUpload name={me.name} url={me.avatarUrl} action={updateAvatar} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-3">{me.name}</h1>
          <p className="text-sm text-white/75">{me.email}</p>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{ROLE_LABEL[me.role]}</span>
            {pro && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white text-accent px-3 py-1 text-xs font-extrabold">
                <Sparkles className="w-3 h-3" aria-hidden /> PRO
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-lg mx-auto px-4 -mt-12 relative space-y-6 pb-4">
        {/* Números del profesional */}
        {wp && r && (
          <div className="card p-4">
            <div className="grid grid-cols-3 divide-x divide-line text-center">
              <div>
                <p className="text-xl font-extrabold flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-gold text-gold" aria-hidden />
                  {wp.ratingCount > 0 ? wp.ratingAvg.toFixed(1) : "—"}
                </p>
                <p className="text-[11px] font-semibold text-muted">{wp.ratingCount} reseñas</p>
              </div>
              <div>
                <p className="text-xl font-extrabold">{wp.jobsDone}</p>
                <p className="text-[11px] font-semibold text-muted">trabajos</p>
              </div>
              <div>
                <p className="text-xl font-extrabold text-gradient">{r.rank}</p>
                <p className="text-[11px] font-semibold text-muted">{r.score}/100 pts</p>
              </div>
            </div>
            <details className="group mt-3 border-t border-line pt-3">
              <summary className="list-none cursor-pointer text-xs font-bold text-accent text-center">
                <span className="group-open:hidden">Ver cómo se calcula tu rango</span>
                <span className="hidden group-open:inline">Ocultar detalle</span>
              </summary>
              <div className="mt-3 space-y-2.5">
                {r.parts.map((p) => (
                  <ProgressBar key={p.label} label={p.label} value={p.value} max={p.max} />
                ))}
                <p className="text-xs text-faint">
                  {r.next ? `Faltan ${r.toNext} puntos para el rango ${r.next}.` : "¡Alcanzaste el rango máximo!"}
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Pro */}
        {me.role === "WORKER" && (
          <Link href="/pro" className="block relative overflow-hidden rounded-[22px] bg-brand text-white p-5 shadow-glow card-hover">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/15 blur-xl" aria-hidden />
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white/80">
              <Sparkles className="w-3.5 h-3.5" aria-hidden /> Better Work Pro
            </p>
            <p className="text-lg font-extrabold mt-1">
              {pro ? `Activo hasta el ${formatDate(wp!.proUntil!)}` : "Conseguí más trabajos"}
            </p>
            <p className="text-sm text-white/80 mt-0.5">
              {pro ? "Gestioná tu suscripción y tus pagos." : "Aparecé primero y mandá presupuestos sin límite."}
            </p>
            <span className="inline-flex items-center gap-1 mt-3 text-sm font-bold">
              {pro ? "Ver mi suscripción" : "Ver planes"} <ChevronRight className="w-4 h-4" aria-hidden />
            </span>
          </Link>
        )}

        <Menu title={me.role === "WORKER" ? "Tu trabajo" : me.role === "COMPANY" ? "Tu empresa" : "Tu cuenta"} items={work} />
        <Menu title="Actividad" items={activity} />

        {(me.role === "CLIENT" || me.role === "COMPANY") && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint px-1 mb-2">Pagos</h2>
            <div className="card p-5">
              <h3 className="font-bold text-sm">Cómo preferís pagar</h3>
              <p className="text-xs text-muted mt-0.5">Para que el profesional sepa qué esperar antes de coordinar.</p>
              <form action={updatePayPreference} className="mt-3 space-y-1">
                <div className="flex flex-wrap gap-2">
                  {PAY_PREFERENCE_OPTIONS.map((m) => (
                    <label key={m} className="chip has-[:checked]:border-accent has-[:checked]:text-accent has-[:checked]:bg-accent/8">
                      <input type="checkbox" name="payPreference" value={m} defaultChecked={payPreference.includes(m)} className="sr-only" />
                      {m}
                    </label>
                  ))}
                </div>
                <button className="btn-secondary w-full !py-2.5 !text-sm mt-3">Guardar</button>
              </form>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint px-1 mb-2">Preferencias</h2>
          <div className="card p-4 space-y-4">
            <div>
              <p className="text-sm font-bold mb-2">Apariencia</p>
              <ThemeToggle />
            </div>
            <InstallButton className="w-full !py-3" />
            <ChangePasswordForm />
          </div>
        </section>

        <form action={logout}>
          <button className="btn-secondary w-full !text-danger hover:!bg-danger/8 hover:!border-danger/30">
            <LogOut className="w-4 h-4" aria-hidden /> Cerrar sesión
          </button>
        </form>

        {me.role !== "ADMIN" && <DeleteAccountForm hasPassword={!!me.passwordHash} />}
      </div>
    </main>
  );
}
