import { JOB_FLOW, JOB_STATUS_LABEL } from "@/lib/format";

export function StatusTimeline({ status }: { status: string }) {
  if (status === "CANCELLED" || status === "REJECTED") {
    return (
      <div className="card p-4 text-center">
        <p className="font-semibold">{JOB_STATUS_LABEL[status]}</p>
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
                  i <= currentIdx ? "bg-fg" : "bg-line"
                }`}
              />
            )}
            <span
              className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                done ? "bg-fg border-fg text-bg" : "bg-surface border-line"
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
