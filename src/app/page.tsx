import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MapPin,
  ShieldCheck,
  Star,
  Search,
  MessageCircle,
  CheckCircle2,
  Wrench,
  Building2,
  Store,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { InstallButton } from "@/components/InstallButton";
import { getTradeIndex } from "@/lib/seo";

const STEPS = [
  { icon: Search, title: "Buscá o pedí", desc: "Elegí en el mapa o publicá tu pedido con fotos y te cotizan varios." },
  { icon: MessageCircle, title: "Coordiná", desc: "Hablá por chat, compará presupuestos y elegí con reseñas reales." },
  { icon: CheckCircle2, title: "Listo", desc: "Inicio y fin confirmados con código. Calificás y queda en su perfil." },
];

const ROLES = [
  { icon: User, title: "Necesito un servicio", desc: "Plomeros, electricistas, albañiles y más, cerca tuyo.", href: "/register", cta: "Crear cuenta" },
  { icon: Wrench, title: "Soy profesional", desc: "Recibí pedidos de tu zona y armá tu reputación. Gratis.", href: "/register?rol=trabajador", cta: "Ofrecer mis servicios" },
  { icon: Building2, title: "Soy una empresa", desc: "Publicá empleos y encontrá personal verificado.", href: "/register?rol=empresa", cta: "Registrar empresa" },
  { icon: Store, title: "Vendo materiales", desc: "Llegá a profesionales y clientes con tu corralón o ferretería.", href: "/register?rol=proveedor", cta: "Abrir mi tienda" },
];

export default async function Landing() {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin" : "/app");
  const trades = await getTradeIndex().catch(() => []);

  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
        <div className="absolute -right-24 top-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -left-24 bottom-0 w-80 h-80 rounded-full bg-white/10 blur-3xl" aria-hidden />

        <header className="relative flex items-center justify-between px-5 py-5 max-w-6xl mx-auto w-full">
          <Link href="/" className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-9 h-9 rounded-[22%] ring-2 ring-white/30" />
            <span className="text-lg font-extrabold tracking-tight whitespace-nowrap">Manobra</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/login" className="rounded-2xl px-3 sm:px-4 py-2.5 text-sm font-bold whitespace-nowrap text-white/85 hover:text-white hover:bg-white/10 transition">
              Ingresar
            </Link>
            <Link href="/register" className="rounded-2xl px-3.5 sm:px-4 py-2.5 text-sm font-bold whitespace-nowrap bg-white text-black hover:bg-white/90 transition shadow-lg">
              Crear cuenta
            </Link>
          </nav>
        </header>

        <div className="relative max-w-6xl mx-auto px-5 pt-10 pb-24 sm:pt-16 sm:pb-32 text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/12 border border-white/15 px-3.5 py-1.5 text-xs font-bold animate-fade-up">
            <Sparkles className="w-3.5 h-3.5" aria-hidden /> Profesionales verificados cerca tuyo
          </p>
          <h1
            className="text-[42px] sm:text-7xl font-extrabold tracking-tight leading-[1.02] max-w-3xl mx-auto mt-5 animate-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            El profesional que necesitás, <span className="text-white/65">a un toque.</span>
          </h1>
          <p className="text-base sm:text-lg text-white/80 mt-6 max-w-xl mx-auto animate-fade-up" style={{ animationDelay: "120ms" }}>
            Encontrá plomeros, electricistas, albañiles y más en el mapa. Pedí presupuestos, coordiná por chat y comprá
            los materiales en el mismo lugar.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-9 animate-fade-up" style={{ animationDelay: "180ms" }}>
            <Link href="/register" className="rounded-2xl px-7 py-4 text-base font-extrabold bg-white text-black hover:bg-white/90 transition shadow-xl inline-flex items-center justify-center gap-2">
              Empezar gratis <ArrowRight className="w-5 h-5" aria-hidden />
            </Link>
            <Link href="/register?rol=trabajador" className="rounded-2xl px-7 py-4 text-base font-bold border border-white/30 hover:bg-white/10 transition inline-flex items-center justify-center gap-2">
              <Wrench className="w-5 h-5" aria-hidden /> Soy profesional
            </Link>
          </div>
          <div className="mt-4 flex justify-center">
            <InstallButton className="!bg-transparent !border-white/25 !text-white/85 hover:!bg-white/10" />
          </div>

          {/* Confianza */}
          <div className="mt-14 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            {[
              { icon: MapPin, t: "En el mapa", d: "cerca tuyo" },
              { icon: ShieldCheck, t: "Verificados", d: "y con código" },
              { icon: Star, t: "Reseñas", d: "100% reales" },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur p-3 sm:p-4">
                <x.icon className="w-5 h-5 mx-auto" aria-hidden />
                <p className="text-sm font-extrabold mt-2">{x.t}</p>
                <p className="text-[11px] text-white/65">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="max-w-6xl mx-auto w-full px-5 -mt-12 relative">
        <div className="card !rounded-[28px] p-6 sm:p-8 grid sm:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex sm:block gap-4">
              <span className="icon-tile w-12 h-12 bg-brand text-brand-fg shadow-glow relative">
                <s.icon className="w-6 h-6" aria-hidden />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-fg text-bg text-[10px] font-extrabold flex items-center justify-center">
                  {i + 1}
                </span>
              </span>
              <div>
                <h3 className="font-extrabold text-lg sm:mt-4">{s.title}</h3>
                <p className="text-sm text-muted mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Para quién ── */}
      <section className="max-w-6xl mx-auto w-full px-5 py-16 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent text-center">Para todos</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center mt-2">¿Cómo querés usar Manobra?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {ROLES.map((r) => (
            <Link key={r.title} href={r.href} className="card card-hover p-6 flex flex-col group">
              <span className="icon-tile w-12 h-12 bg-surface-2 text-accent group-hover:bg-brand group-hover:text-brand-fg transition">
                <r.icon className="w-6 h-6" aria-hidden />
              </span>
              <h3 className="font-extrabold text-lg mt-4">{r.title}</h3>
              <p className="text-sm text-muted mt-1 flex-1">{r.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-accent mt-4">
                {r.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Oficios (también le marcan el camino a Google) ── */}
      {trades.length > 0 && (
        <section className="max-w-4xl mx-auto w-full px-5 pb-16 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight">¿Qué necesitás?</h2>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {trades.map((t) => (
              <Link key={t.slug} href={`/servicios/${t.slug}`} className="chip !py-2 !px-4">
                <span aria-hidden><span className="grayscale">{t.icon}</span></span> {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Llamado final ── */}
      <section className="max-w-6xl mx-auto w-full px-5 pb-16">
        <div className="relative overflow-hidden rounded-[32px] bg-brand text-brand-fg p-8 sm:p-12 text-center shadow-glow">
          <div className="absolute inset-0 bg-dots opacity-50" aria-hidden />
          <h2 className="relative text-3xl sm:text-4xl font-extrabold tracking-tight">Tu próximo trabajo empieza acá</h2>
          <p className="relative text-brand-fg/80 mt-3">Crear la cuenta es gratis y lleva un minuto.</p>
          <Link href="/register" className="relative inline-flex items-center gap-2 mt-7 rounded-2xl px-7 py-4 font-extrabold bg-bg text-fg hover:opacity-90 transition shadow-xl">
            Crear mi cuenta <ArrowRight className="w-5 h-5" aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-faint">
          <span>© Manobra — Conectando personas con profesionales.</span>
          <nav className="flex gap-5">
            <Link href="/servicios" className="hover:text-fg">Servicios</Link>
            <Link href="/register?rol=trabajador" className="hover:text-fg">Trabajá con nosotros</Link>
            <Link href="/register?rol=proveedor" className="hover:text-fg">Vendé materiales</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
