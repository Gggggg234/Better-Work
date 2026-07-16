"use client";

/**
 * Selector de opciones tipo "pills". Reutilizable para selección única o
 * múltiple (experiencia, radio, modalidad, días, métodos de pago…).
 */
export function OptionPills<T extends string | number>({
  options,
  value,
  onChange,
  multiple = false,
  columns,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T[] | T | null;
  onChange: (next: T[] | T) => void;
  multiple?: boolean;
  columns?: number;
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);

  function toggle(v: T) {
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    } else {
      onChange(v);
    }
  }

  return (
    <div className={columns ? "grid gap-2" : "flex flex-wrap gap-2"} style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => toggle(o.value)}
          aria-pressed={selected(o.value)}
          className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium transition text-center ${
            selected(o.value)
              ? "border-fg bg-fg text-bg"
              : "border-line bg-surface text-muted hover:border-fg/40"
          }`}
        >
          {o.icon ? `${o.icon} ` : ""}
          {o.label}
        </button>
      ))}
    </div>
  );
}
