import { db } from "@/lib/db";
import { resolveReport } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierta",
  RESOLVED: "Resuelta",
  DISMISSED: "Desestimada",
};

export default async function AdminReportsPage() {
  const reports = await db.report.findMany({
    include: { reporter: true, target: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Denuncias</h1>

      <div className="space-y-2">
        {reports.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm">
                <span className="font-semibold">{r.reporter.name}</span>
                <span className="text-faint"> denunció a </span>
                <span className="font-semibold">{r.target.name}</span>
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  r.status === "OPEN" ? "bg-fg text-bg" : "bg-surface-2 text-muted"
                }`}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <p className="text-sm text-muted mt-1.5">{r.reason}</p>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-faint">{formatDateTime(r.createdAt)}</p>
              {r.status === "OPEN" && (
                <div className="flex gap-1.5">
                  <form action={resolveReport.bind(null, r.id, "RESOLVED" as const)}>
                    <button className="btn-primary !py-1.5 !px-2.5 !text-xs">Marcar resuelta</button>
                  </form>
                  <form action={resolveReport.bind(null, r.id, "DISMISSED" as const)}>
                    <button className="btn-ghost !py-1.5 !px-2.5 !text-xs">Desestimar</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="card p-8 text-center text-sm text-faint">No hay denuncias. 🎉</div>
        )}
      </div>
    </div>
  );
}
