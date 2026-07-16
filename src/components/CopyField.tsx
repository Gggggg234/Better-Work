"use client";

import { useState } from "react";

/** Fila etiqueta/valor con botón para copiar el valor al portapapeles. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard no disponible: el valor sigue visible para copiar a mano */
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="font-medium text-sm break-all select-all">{value}</p>
      </div>
      <button type="button" onClick={copy} className="btn-secondary shrink-0 !py-1.5 !px-3 !text-xs">
        {copied ? "Copiado ✓" : "Copiar"}
      </button>
    </div>
  );
}
