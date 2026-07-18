/**
 * Gráficos minimalistas en SVG puro: sin librerías (bundle liviano) y en
 * blanco y negro con los tokens del tema.
 */

export type Point = { label: string; value: number };

/** Tarjeta de métrica. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xl font-bold truncate">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-faint mt-0.5">{hint}</p>}
    </div>
  );
}

/** Gráfico de barras. */
export function BarChart({ data, height = 120 }: { data: Point[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group">
            <span className="text-[10px] text-faint opacity-0 group-hover:opacity-100 transition">{d.value}</span>
            <div
              className="w-full rounded-t bg-fg transition-all"
              style={{ height: `${Math.max(2, (d.value / max) * (height - 18))}px` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-[10px] text-faint text-center">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Gráfico de línea (evolución). */
export function LineChart({ data, height = 120, max: maxProp }: { data: Point[]; height?: number; max?: number }) {
  const w = 300;
  const pad = 6;
  const max = Math.max(maxProp ?? 0, 1, ...data.map((d) => d.value));
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const pts = data.map((d, i) => `${pad + i * step},${y(d.value)}`).join(" ");
  const area = `${pad},${height - pad} ${pts} ${pad + (data.length - 1) * step},${height - pad}`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <polygon points={area} fill="currentColor" className="text-fg/10" />
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" className="text-fg" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => (
          <circle key={i} cx={pad + i * step} cy={y(d.value)} r="2.5" fill="currentColor" className="text-fg" />
        ))}
      </svg>
      <div className="flex mt-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-[10px] text-faint text-center">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Barra de progreso (para el desglose del rango). */
export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted">{label}</span>
          <span className="text-faint">{value}/{max}</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-fg rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
