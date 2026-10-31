import Link from "next/link";
import type { Faq } from "@/lib/seo";

/** Migas de pan visibles (las de Google van aparte, en JSON-LD). */
export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Migas de pan" className="text-xs text-faint">
      {items.map((it, i) => (
        <span key={it.label}>
          {i > 0 && <span className="mx-1.5">/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-fg">{it.label}</Link>
          ) : (
            <span className="text-muted">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const STEPS = [
  ["Contá qué necesitás", "Describí el trabajo, sumá fotos o documentos y marcá el lugar en el mapa. Pedir es gratis."],
  ["Recibí el presupuesto", "El profesional te pasa precio y tiempo estimado. Lo aceptás, le pedís cambios o lo rechazás."],
  ["Elegí con confianza", "Compará precios, tiempos y calificaciones de clientes reales antes de decidir."],
  ["Confirmá y calificá", "El trabajo empieza y termina con códigos de 4 dígitos. Al final, ambos se califican."],
] as const;

export function HowItWorks() {
  return (
    <section>
      <h2 className="text-lg font-bold">Cómo funciona</h2>
      <ol className="grid sm:grid-cols-2 gap-3 mt-4">
        {STEPS.map(([title, desc], i) => (
          <li key={title} className="card p-4 flex gap-3">
            <span className="w-7 h-7 rounded-full bg-fg text-bg text-xs font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-sm text-muted mt-0.5">{desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FaqSection({ faq }: { faq: Faq[] }) {
  return (
    <section>
      <h2 className="text-lg font-bold">Preguntas frecuentes</h2>
      <div className="card divide-y divide-line mt-4">
        {faq.map((f) => (
          <details key={f.q} className="group p-4">
            <summary className="font-medium text-sm cursor-pointer list-none flex justify-between gap-3">
              {f.q}
              <span className="text-faint transition group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="text-sm text-muted mt-2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Llamado a profesionales del oficio: las páginas de SEO también suman oferta. */
export function JoinCta({ singular, place }: { singular: string; place?: string }) {
  return (
    <section className="card p-5 sm:p-6 bg-fg text-bg !border-fg">
      <h2 className="text-lg font-bold">¿Sos {singular}?</h2>
      <p className="text-sm text-bg/70 mt-1">
        Sumate gratis a Better Work y recibí pedidos de clientes{place ? ` de ${place}` : " de tu zona"}. Pasás tu
        propio presupuesto y el cliente te paga directo: Better Work no te cobra comisión por trabajo.
      </p>
      <Link href="/register?rol=trabajador" className="btn-secondary mt-4 inline-flex">
        Quiero recibir trabajos
      </Link>
    </section>
  );
}
