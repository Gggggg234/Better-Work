import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/Stars";
import type { PublicWorker } from "@/lib/seo";

/**
 * Tarjeta pública de un profesional (páginas de SEO). Muestra nombre de pila
 * + inicial y ciudad, nunca la ubicación exacta. Para contratar hay que tener
 * cuenta, así que lleva al registro.
 */
export function WorkerCard({ worker: w }: { worker: PublicWorker }) {
  const place = [w.zone, w.city].filter(Boolean).join(", ");
  return (
    <article className="card p-4 flex flex-wrap sm:flex-nowrap gap-3.5">
      <Avatar name={w.name} url={w.avatarUrl} size={52} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="font-semibold text-sm">{w.name}</h3>
          {w.verified && (
            <span className="rounded-full bg-fg text-bg px-1.5 py-px text-[10px] font-semibold">✓ Verificado</span>
          )}
        </div>
        <p className="text-xs text-muted">
          {w.profession}
          {place && ` · ${place}`}
        </p>
        <p className="text-xs text-faint mt-1">
          {w.ratingCount > 0 ? (
            <>
              <Stars value={w.ratingAvg} size="text-xs" /> {w.ratingAvg.toFixed(1)} ({w.ratingCount}) ·{" "}
              {w.jobsDone} {w.jobsDone === 1 ? "trabajo" : "trabajos"}
            </>
          ) : (
            "Nuevo en Better Work"
          )}
        </p>
        {w.priceHint && <p className="text-xs text-muted mt-1">{w.priceHint}</p>}
      </div>
      <Link href="/register" className="btn-secondary !py-2 !px-3 !text-xs w-full sm:w-auto sm:self-center shrink-0">
        Pedir presupuesto
      </Link>
    </article>
  );
}
