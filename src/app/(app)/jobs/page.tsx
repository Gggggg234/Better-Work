import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CalendarClock, ClipboardList, Siren, ChevronRight, Search } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PageHero } from "@/components/ui/ActionCards";
import { JOB_STATUS_LABEL, JOB_STATUS_TONE, toneBadge, formatDateTime, formatMoney } from "@/lib/format";

const ACTIVE = ["REQUESTED", "ACCEPTED", "EN_ROUTE", "WORKING"];

export default async function JobsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const jobs = await db.job.findMany({
    where: { OR: [{ clientId: me.id }, { workerId: me.id }] },
    include: { client: true, worker: true },
    orderBy: { requestedAt: "desc" },
    take: 50,
  });

  // Los pedidos urgentes todavía sin responder van primero.
  const urgentFirst = (j: (typeof jobs)[number]) => (j.urgent && j.status === "REQUESTED" ? 0 : 1);
  const active = jobs
    .filter((j) => ACTIVE.includes(j.status))
    .sort((a, b) => urgentFirst(a) - urgentFirst(b));
  const past = jobs.filter((j) => !ACTIVE.includes(j.status));

  function JobRow({ job }: { job: (typeof jobs)[number] }) {
    const other = job.clientId === me!.id ? job.worker : job.client;
    const isActive = ACTIVE.includes(job.status);
    return (
      <Link
        href={`/jobs/${job.id}`}
        className={`card card-hover p-4 flex items-center gap-3.5 ${job.urgent && isActive ? "!border-danger/30" : ""}`}
      >
        <Avatar name={other.name} url={other.avatarUrl} size={48} className="!rounded-2xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={toneBadge(JOB_STATUS_TONE[job.status] ?? "neutral")}>{JOB_STATUS_LABEL[job.status]}</span>
            {job.urgent && isActive && (
              <span className="badge badge-danger">
                <Siren className="w-3 h-3" aria-hidden /> Urgente
              </span>
            )}
          </div>
          <p className="font-bold text-[15px] truncate mt-1">{job.title}</p>
          <p className="text-xs text-muted truncate">
            {job.clientId === me!.id ? "Profesional" : "Cliente"}: {other.name}
          </p>
          <p className="text-[11px] text-faint flex items-center gap-1 mt-0.5">
            <CalendarClock className="w-3 h-3" aria-hidden />
            {job.scheduledFor ? `${formatDateTime(job.scheduledFor)} hs` : `Pedido ${formatDateTime(job.requestedAt)}`}
          </p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          {job.price != null && <p className="text-sm font-extrabold">{formatMoney(job.price)}</p>}
          <ChevronRight className="w-4 h-4 text-faint" aria-hidden />
        </div>
      </Link>
    );
  }

  return (
    <main className="w-full">
      <PageHero
        eyebrow={me.role === "WORKER" ? "Tu agenda" : "Lo que contrataste"}
        title="Trabajos"
        subtitle={`${active.length} en curso · ${past.length} en el historial`}
      >
        <Link href="/pedidos" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3.5 py-1.5 text-xs font-bold transition">
          <ClipboardList className="w-3.5 h-3.5" aria-hidden />
          {me.role === "WORKER" ? "Pedidos cerca tuyo" : "Mis pedidos de presupuesto"}
        </Link>
      </PageHero>

      <div className="max-w-lg mx-auto px-4 -mt-8 relative pb-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint px-1 mb-2 sr-only">En curso</h2>
        <div className="space-y-2.5">
          {active.map((j) => <JobRow key={j.id} job={j} />)}
          {active.length === 0 && (
            <div className="card p-8 text-center">
              <span className="icon-tile w-14 h-14 bg-surface-2 text-muted mx-auto">
                <CalendarClock className="w-7 h-7" aria-hidden />
              </span>
              <p className="font-bold mt-4">No tenés trabajos en curso</p>
              <p className="text-sm text-muted mt-1">
                {me.role === "WORKER" ? "Cotizá pedidos de tu zona para sumar trabajos." : "Encontrá a alguien de confianza cerca tuyo."}
              </p>
              <Link href={me.role === "WORKER" ? "/pedidos" : "/search"} className="btn-primary mt-4 inline-flex">
                {me.role === "WORKER" ? (
                  <>
                    <ClipboardList className="w-4 h-4" aria-hidden /> Ver pedidos cerca
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" aria-hidden /> Buscar profesional
                  </>
                )}
              </Link>
            </div>
          )}
        </div>

        {past.length > 0 && (
          <>
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint px-1 mt-8 mb-2">Historial</h2>
            <div className="space-y-2.5">{past.map((j) => <JobRow key={j.id} job={j} />)}</div>
          </>
        )}
      </div>
    </main>
  );
}
