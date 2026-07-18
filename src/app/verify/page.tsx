import Link from "next/link";
import { db } from "@/lib/db";
import { consumeEmailToken } from "@/lib/tokens";
import { Brand } from "@/components/Brand";

/**
 * Página a la que lleva el enlace del email. Consume el token y confirma la
 * cuenta. No inicia sesión sola: el usuario entra desde el login, así el
 * enlace reenviado a otra persona no da acceso.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  const result = token ? await consumeEmailToken(token) : ({ ok: false, reason: "invalid" } as const);

  if (result.ok) {
    await db.user.update({ where: { id: result.userId }, data: { emailVerified: new Date() } });
  }

  const view = result.ok
    ? {
        icon: "✓",
        title: "¡Email confirmado!",
        text: "Tu cuenta ya está activa. Iniciá sesión para empezar a usar Better Work.",
        cta: { href: "/login", label: "Iniciar sesión" },
      }
    : result.reason === "expired"
      ? {
          icon: "⏱",
          title: "El enlace venció",
          text: "Los enlaces duran 24 horas. Pedí uno nuevo desde el inicio de sesión y te lo reenviamos.",
          cta: { href: "/login", label: "Pedir un enlace nuevo" },
        }
      : {
          icon: "✕",
          title: "Enlace inválido",
          text: "Este enlace no sirve o ya se usó. Si ya confirmaste tu cuenta, simplemente iniciá sesión.",
          cta: { href: "/login", label: "Ir al inicio de sesión" },
        };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up text-center">
        <Brand href="/" />
        <div
          className={`w-14 h-14 rounded-2xl mx-auto mt-10 flex items-center justify-center text-2xl ${
            result.ok ? "bg-fg text-bg" : "bg-surface-2 text-fg border border-line"
          }`}
        >
          {view.icon}
        </div>
        <h1 className="text-2xl font-bold mt-5">{view.title}</h1>
        <p className="text-sm text-muted mt-2">{view.text}</p>
        <Link href={view.cta.href} className="btn-primary w-full mt-8 !py-3">
          {view.cta.label}
        </Link>
      </div>
    </main>
  );
}
