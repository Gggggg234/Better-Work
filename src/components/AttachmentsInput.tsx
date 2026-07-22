"use client";

import { useRef, useState } from "react";

/**
 * Selector de adjuntos para la solicitud: varias fotos y documentos
 * (PDF, Word, Excel, texto). Los archivos viajan en el form con name
 * "attachments" y los guarda `requestJob`.
 */
export function AttachmentsInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  function onPick(list: FileList | null) {
    if (!list) return;
    // Hasta 10, sin pasar los 15 MB por archivo.
    const next = [...files, ...Array.from(list)].filter((f) => f.size <= 15 * 1024 * 1024).slice(0, 10);
    setFiles(next);
    syncInput(next);
  }

  function removeAt(i: number) {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    syncInput(next);
  }

  // El <input type=file> no es editable por JS con una lista arbitraria salvo
  // vía DataTransfer: así el form sube exactamente lo que se ve en pantalla.
  function syncInput(list: File[]) {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    list.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name="attachments"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={(e) => onPick(e.target.files)}
        className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-fg file:px-3 file:py-2 file:text-xs file:font-medium file:text-bg hover:file:opacity-90"
      />
      <p className="text-[11px] text-faint mt-1.5">
        Fotos y documentos (PDF, Word, Excel), hasta 15 MB cada uno. Ej: fotos del problema, planos, presupuestos.
      </p>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
            >
              <span aria-hidden>{f.type.startsWith("image/") ? "🖼" : "📄"}</span>
              <span className="flex-1 min-w-0 truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="text-faint hover:text-red-600 transition text-xs shrink-0"
                aria-label={`Quitar ${f.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
