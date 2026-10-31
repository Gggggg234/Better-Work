import Link from "next/link";
import { Brand } from "@/components/Brand";

/** Páginas públicas de SEO local: sin sesión, para que Google las pueda leer. */
export default function ServiciosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-5 max-w-5xl mx-auto w-full">
        <Brand href="/" />
        <nav className="flex gap-2">
          <Link href="/login" className="btn-ghost">Ingresar</Link>
          <Link href="/register" className="btn-primary">Crear cuenta</Link>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-line mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-faint">
          <p>Better Work — Conectando personas con profesionales.</p>
          <nav className="flex gap-4">
            <Link href="/servicios" className="hover:text-fg">Todos los servicios</Link>
            <Link href="/register?rol=trabajador" className="hover:text-fg">Trabajá con nosotros</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
