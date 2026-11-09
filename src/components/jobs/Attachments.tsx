export type AttachmentItem = { url: string; name: string; type: string };

/** Lee el JSON de adjuntos guardado en un pedido o trabajo (tolera basura). */
export function parseAttachments(json: string): AttachmentItem[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Fotos (miniatura) y documentos (tarjeta) de una solicitud. */
export function Attachments({ items, title = "Adjuntos de la solicitud" }: { items: AttachmentItem[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-faint mb-3">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((a) =>
          a.type === "image" ? (
            <a
              key={a.url}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="aspect-square rounded-xl overflow-hidden border border-line block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </a>
          ) : (
            <a
              key={a.url}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="aspect-square rounded-xl border border-line flex flex-col items-center justify-center gap-1 p-2 text-center hover:bg-surface-2 transition"
            >
              <span className="text-2xl" aria-hidden><span className="grayscale">📄</span></span>
              <span className="text-[10px] text-muted truncate w-full">{a.name}</span>
            </a>
          )
        )}
      </div>
    </div>
  );
}
