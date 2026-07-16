import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { InstallButton } from "@/components/InstallButton";

export default async function Landing() {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin" : "/app");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <Brand href="/" />
        <nav className="flex gap-2">
          <Link href="/login" className="btn-ghost">Ingresar</Link>
          <Link href="/register" className="btn-primary">Crear cuenta</Link>
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight max-w-2xl leading-[1.05] animate-fade-up">
          El profesional que necesitás, a un toque.
        </h1>
        <p className="text-lg text-muted mt-6 max-w-md animate-fade-up" style={{ animationDelay: "80ms" }}>
          Encontrá albañiles, electricistas, programadores, profesores y más cerca tuyo. Contratá en pocos pasos, con
          confirmación por código y calificaciones reales.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-10 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <Link href="/register" className="btn-primary !px-8 !py-3.5 !text-base">Empezar ahora</Link>
          <Link href="/login" className="btn-secondary !px-8 !py-3.5 !text-base">Ya tengo cuenta</Link>
          <InstallButton className="!px-8 !py-3.5 !text-base" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 max-w-3xl w-full text-left">
          {[
            ["🗺", "Cerca tuyo", "Mirá el mapa y elegí entre trabajadores y empresas de tu zona."],
            ["🔒", "Códigos de confirmación", "Inicio y fin del trabajo verificados, como en Uber."],
            ["★", "Reputación real", "Calificaciones mutuas y rangos que generan confianza."],
          ].map(([icon, title, desc]) => (
            <div key={title} className="card p-5">
              <span className="text-2xl">{icon}</span>
              <h3 className="font-semibold mt-3">{title}</h3>
              <p className="text-sm text-muted mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-faint py-6">
        Better Work — Conectando personas con profesionales.
      </footer>
    </main>
  );
}
