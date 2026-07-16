export function Stars({ value, size = "text-sm" }: { value: number; size?: string }) {
  const full = Math.round(value);
  return (
    <span className={`${size} tracking-tight`} aria-label={`${value.toFixed(1)} de 5`}>
      <span className="text-fg">{"★".repeat(Math.min(5, full))}</span>
      <span className="text-faint">{"★".repeat(Math.max(0, 5 - full))}</span>
    </span>
  );
}
