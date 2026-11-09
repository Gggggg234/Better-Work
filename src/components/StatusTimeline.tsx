import { JOB_FLOW, JOB_STATUS_LABEL } from "@/lib/format";

export function StatusTimeline({ status }: { status: string }) {
  if (status === "CANCELLED" || status === "REJECTED") {
    return (
      <div className="card p-4 flex items-center gap-3 border-danger/30">
        <span className="badge badge-danger">{JOB_STATUS_LABEL[status]}</span>
        <p className="text-sm text-muted">Este trabajo no sigue activo.</p>
      </div>
    );
  }
  const currentIdx = JOB_FLOW.indexOf(status as (typeof JOB_FLOW)[number]);
  return (
    <ol className="flex items-center w-full">
      {JOB_FLOW.map((s, i) => {
        const done = i <= currentIdx;
        return (
          <li key={s} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <span
                className={`absolute top-[9px] right-1/2 w-full h-0.5 ${
                  i <= currentIdx ? (status === "COMPLETED" ? "bg-success" : "bg-accent") : "bg-line"
                }`}
              />
            )}
            <span
              className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                done
                  ? status === "COMPLETED"
                    ? "bg-fg border-fg text-bg"
                    : "bg-accent border-accent text-accent-fg"
                  : "bg-surface border-line"
              }`}
            >
              {done ? "✓" : ""}
            </span>
            <span
              className={`mt-1.5 text-[10px] text-center leading-tight ${
                done ? "text-fg font-medium" : "text-faint"
              }`}
            >
              {JOB_STATUS_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
