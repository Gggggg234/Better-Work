"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Avatar } from "@/components/Avatar";
import { POST_KINDS } from "@/lib/feed";

function PublishButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary !py-2 !px-4">
      {pending ? "Publicando…" : "Publicar"}
    </button>
  );
}

/** Compositor del feed: texto + varias imágenes + tipo + ubicación opcional. */
export function PostComposer({
  name,
  avatarUrl,
  action,
}: {
  name: string;
  avatarUrl?: string | null;
  action: (fd: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("GENERAL");
  const [previews, setPreviews] = useState<string[]>([]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locLabel, setLocLabel] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 6);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocLabel("Mi ubicación");
      },
      () => {}
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card p-4 w-full flex items-center gap-3 text-left hover:bg-surface-2 transition"
      >
        <Avatar name={name} url={avatarUrl} size={40} />
        <span className="text-muted text-sm">Compartí un trabajo, consejo o novedad…</span>
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card p-4 space-y-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="locationLabel" value={locLabel} />

      <div className="flex items-center gap-3">
        <Avatar name={name} url={avatarUrl} size={40} />
        <p className="font-semibold text-sm">{name}</p>
      </div>

      <textarea
        name="content"
        autoFocus
        className="input min-h-24"
        placeholder="¿Qué querés compartir con la comunidad?"
      />

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {POST_KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
              kind === k.value ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:border-fg/40"
            }`}
          >
            {k.icon} {k.label}
          </button>
        ))}
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="aspect-square object-cover rounded-lg border border-line w-full" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <label className="btn-secondary !py-1.5 !px-3 !text-xs cursor-pointer">
          🖼 Fotos
          <input type="file" name="images" accept="image/*" multiple className="hidden" onChange={onFiles} />
        </label>
        <button type="button" onClick={locate} className="btn-secondary !py-1.5 !px-3 !text-xs">
          📍 {locLabel ? "Ubicación ✓" : "Ubicación"}
        </button>
        <div className="flex-1" />
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-1.5 !px-3 !text-xs">
          Cancelar
        </button>
        <PublishButton />
      </div>
    </form>
  );
}
