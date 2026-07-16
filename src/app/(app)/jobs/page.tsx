import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { JOB_STATUS_LABEL, formatDateTime, formatMoney } from "@/lib/format";

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

  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  const past = jobs.filter((j) => !ACTIVE.includes(j.status));

  function JobRow({ job }: { job: (typeof jobs)[number] }) {
    const other = job.clientId === me!.id ? job.worker : job.client;
    const isActive = ACTIVE.includes(job.status);
    return (
      <Link href={`/jobs/${job.id}`} className="card p-4 flex items-center gap-3.5 hover:shadow-md transition">
        <Avatar name={other.name} url={other.avatarUrl} size={44} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{job.title}</p>
          <p className="text-xs text-muted">
            {job.clientId === me!.id ? "Trabajador" : "Cliente"}: {other.name}
          </p>
          <p className="text-xs text-faint">
            {job.scheduledFor ? `🗓 ${formatDateTime(job.scheduledFor)} hs` : `Solicitado ${formatDateTime(job.requestedAt)}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isActive ? "bg-fg text-bg" : "bg-surface-2 text-muted"
            }`}
          >
            {JOB_STATUS_LABEL[job.status]}
          </span>
          {job.price != null && <p className="text-xs text-muted mt-1">{formatMoney(job.price)}</p>}
        </div>
      </Link>
    );
  }

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <h1 className="text-2xl font-bold">Trabajos</h1>

      <h2 className="font-semibold mt-6 mb-3 text-muted text-sm uppercase tracking-wide">En curso</h2>
      <div className="space-y-2.5">
        {active.map((j) => <JobRow key={j.id} job={j} />)}
        {active.length === 0 && (
          <div className="card p-6 text-center text-sm text-faint">
            No tenés trabajos activos.
            {me.role === "CLIENT" && (
              <> <Link href="/search" className="underline font-medium text-fg">Buscá un profesional</Link>.</>
            )}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="font-semibold mt-8 mb-3 text-muted text-sm uppercase tracking-wide">Historial</h2>
          <div className="space-y-2.5">{past.map((j) => <JobRow key={j.id} job={j} />)}</div>
        </>
      )}
    </main>
  );
}
