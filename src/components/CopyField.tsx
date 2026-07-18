"use client";

import { useState } from "react";

/**
 * Dato para copiar de un toque (alias, titular, banco).
 *
 * Todo el campo es el botón: copiar un alias a mano en el celular es
 * justamente donde se pierde la gente.
 */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sin permiso de portapapeles: el valor sigue visible para copiar a mano */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copiar ${label}: ${value}`}
      className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 flex items-center justify-between gap-3 text-left hover:border-fg/40 transition"
    >
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wide text-faint">{label}</span>
        <span className="block font-semibold text-sm truncate select-all">{value}</span>
      </span>
      <span className={`text-xs font-medium shrink-0 ${copied ? "text-fg" : "text-muted"}`}>
        {copied ? "✓ Copiado" : "Copiar"}
      </span>
    </button>
  );
}
