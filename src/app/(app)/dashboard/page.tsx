import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { workerMetrics } from "@/lib/metrics";
import { Stat, BarChart, LineChart, ProgressBar } from "@/components/charts/Charts";
import { Stars } from "@/components/Stars";
import { BackButton } from "@/components/BackButton";

function responseLabel(mins: number | null): string {
  if (mins == null) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "WORKER") redirect(me.role === "COMPANY" ? "/company" : "/app");

  const m = await workerMetrics(me.id);
  if (!m) redirect("/worker/profile");

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <BackButton fallback="/app" />
      <h1 className="text-2xl font-bold">Mi rendimiento</h1>
      <p className="text-sm text-muted mt-1">Cómo viene tu actividad en Better Work.</p>

      {/* Rango */}
      <div className="card p-5 mt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-faint">Tu rango</p>
            <p className="text-2xl font-bold">{m.rank.rank}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{m.rank.score}<span className="text-sm text-faint">/100</span></p>
            {m.rank.next && (
              <p className="text-[11px] text-faint">Faltan {m.rank.toNext} pts para {m.rank.next}</p>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {m.rank.parts.map((p) => (
            <ProgressBar key={p.label} label={p.label} value={p.value} max={p.max} />
          ))}
        </div>
        <p className="text-[11px] text-faint mt-3">
          El rango combina calificación, trabajos, puntualidad, tiempo de respuesta y antigüedad. Las cancelaciones
          y los reclamos lo bajan.
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="card p-4">
          <div className="flex items-center gap-1.5">
            <p className="text-xl font-bold">{m.ratingAvg.toFixed(1)}</p>
            <Stars value={m.ratingAvg} size="text-xs" />
          </div>
          <p className="text-xs text-muted mt-0.5">Calificación</p>
          <p className="text-[11px] text-faint">{m.ratingCount} reseñas</p>
        </div>
        <Stat
          label="Ranking en tu categoría"
          value={m.categoryRank ? `#${m.categoryRank}` : "—"}
          hint={m.categoryTotal ? `de ${m.categoryTotal} profesionales` : undefined}
        />
        <Stat label="Solicitudes recibidas" value={m.requests} />
        <Stat label="Trabajos completados" value={m.completed} />
        <Stat label="Clientes nuevos" value={m.newClients} />
        <Stat label="Clientes que repitieron" value={m.repeatClients} />
        <Stat label="Visitas a tu perfil" value={m.profileViews.toLocaleString("es-AR")} />
        <Stat label="Apariciones en búsquedas" value={m.searchAppearances.toLocaleString("es-AR")} />
        <Stat label="Respondés en" value={responseLabel(m.avgResponseMins)} hint="Promedio" />
        <Stat label="Cancelaciones" value={m.cancelled} />
      </div>

      {/* Evolución */}
      <div className="card p-5 mt-3">
        <h2 className="font-semibold text-sm mb-3">Trabajos por mes</h2>
        <BarChart data={m.jobsByMonth} />
      </div>

      <div className="card p-5 mt-3">
        <h2 className="font-semibold text-sm mb-3">Evolución de tu calificación</h2>
        <LineChart data={m.ratingByMonth} max={5} />
      </div>

      <Link href="/ads" className="card p-4 flex items-center justify-between hover:bg-surface-2 transition mt-3">
        <div>
          <p className="text-sm font-medium">📣 Conseguí más trabajo</p>
          <p className="text-xs text-muted">Promocioná tu perfil y medí los resultados.</p>
        </div>
        <span className="text-faint">→</span>
      </Link>
    </main>
  );
}
