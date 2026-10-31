"use client";

import { useState, useTransition } from "react";
import { createOpenRequest } from "@/lib/actions/openRequests";
import { analyzeRequestPhotos, type AnalyzeResult } from "@/lib/actions/ai";
import { LocationPicker } from "@/components/map/LocationPicker";
import { AttachmentsInput } from "@/components/AttachmentsInput";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { formatMoney } from "@/lib/format";

type Category = { id: string; name: string; icon: string };

/** Lado más largo que usa la IA: más grande no suma detalle y cuesta más. */
const AI_MAX_SIDE = 1568;
const AI_MAX_IMAGES = 3;

/** Achica una foto en el navegador a JPEG; null si el formato no se puede leer (p. ej. HEIC en Chrome). */
async function shrink(file: File): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, AI_MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

export function OpenRequestForm({
  categories,
  preselected,
  urgencyPct,
  today,
  timeOptions,
  aiEnabled,
}: {
  categories: Category[];
  preselected: string;
  urgencyPct: number;
  today: string;
  timeOptions: string[];
  aiEnabled: boolean;
}) {
  const [categoryId, setCategoryId] = useState(preselected);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [ai, setAi] = useState<AnalyzeResult | null>(null);
  const [analyzing, startAnalyze] = useTransition();

  const images = photos.filter((f) => f.type.startsWith("image/"));

  function analyze() {
    startAnalyze(async () => {
      const fd = new FormData();
      for (const f of images.slice(0, AI_MAX_IMAGES)) {
        const small = await shrink(f);
        if (small) fd.append("images", small, "foto.jpg");
      }
      if (!fd.has("images")) {
        setAi({ ok: false, error: "No pudimos leer esas fotos. Probá con JPG o PNG." });
        return;
      }
      fd.append("text", [title, description].filter(Boolean).join("\n"));

      const result = await analyzeRequestPhotos(fd);
      setAi(result);
      if (result.ok) {
        // Completa los campos; el cliente los revisa y edita antes de publicar.
        if (result.categoryId) setCategoryId(result.categoryId);
        setTitle(result.title);
        setDescription(result.description);
      }
    });
  }

  return (
    <form action={createOpenRequest} className="space-y-4 mt-6">
      <div>
        <label className="label">Fotos y documentos</label>
        <p className="text-xs text-muted mb-2">
          {aiEnabled
            ? "Sacale fotos al problema: la IA te ayuda a armar el pedido. También podés sumar medidas o planos."
            : "Fotos del problema, medidas, planos: ayudan a presupuestar mejor."}
        </p>
        <AttachmentsInput onFilesChange={setPhotos} />

        {aiEnabled && images.length > 0 && (
          <button
            type="button"
            onClick={analyze}
            disabled={analyzing}
            aria-busy={analyzing}
            className="btn-secondary w-full !py-2.5 !text-sm mt-3 inline-flex items-center justify-center gap-2"
          >
            {analyzing && (
              <span aria-hidden className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            )}
            {analyzing ? "Analizando las fotos…" : ai?.ok ? "✨ Volver a analizar" : "✨ Completar el pedido con IA"}
          </button>
        )}
      </div>

      {/* Resultado del análisis */}
      {ai && !ai.ok && (
        <div className="card p-4 border-red-300" role="alert">
          <p className="text-sm text-red-600">⚠ {ai.error}</p>
        </div>
      )}
      {ai?.ok && (
        <div className="card p-4 space-y-3" aria-live="polite">
          {ai.safetyWarning && (
            <div className="rounded-xl border border-red-300 p-3" role="alert">
              <p className="text-sm font-semibold text-red-600">⚠ Antes que nada</p>
              <p className="text-sm text-red-600 mt-0.5">{ai.safetyWarning}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold">✨ Armamos tu pedido</p>
            <p className="text-xs text-muted mt-0.5">
              {ai.categoryName
                ? `Parece un trabajo de ${ai.categoryName.toLowerCase()}. `
                : "No pudimos identificar el oficio: elegilo abajo. "}
              Completamos el título y la descripción: revisalos y corregí lo que haga falta.
            </p>
          </div>

          {ai.urgent && !urgent && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-muted">Parece urgente. ¿Querés que los profesionales lo vean primero?</p>
              <button type="button" onClick={() => setUrgent(true)} className="btn-secondary !py-1.5 !px-3 !text-xs shrink-0">
                Marcar urgente
              </button>
            </div>
          )}

          {ai.missingInfo.length > 0 && (
            <div>
              <p className="text-xs font-medium">Para un presupuesto más preciso, agregá:</p>
              <ul className="mt-1 space-y-0.5">
                {ai.missingInfo.map((m) => (
                  <li key={m} className="text-xs text-muted">· {m}</li>
                ))}
              </ul>
            </div>
          )}

          {ai.price && (
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-muted">Precios habituales de {ai.categoryName?.toLowerCase()} en Better Work</p>
              <p className="text-sm font-semibold mt-0.5">
                {formatMoney(ai.price.low)} – {formatMoney(ai.price.high)}
              </p>
              <p className="text-[11px] text-faint mt-0.5">
                Según {ai.price.count} presupuestos reales de los últimos 3 meses. Es una referencia: el precio de tu
                trabajo lo define cada profesional.
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="label" htmlFor="categoryId">¿Qué profesional necesitás?</label>
        <select
          id="categoryId"
          name="categoryId"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input"
        >
          <option value="" disabled>Elegí un oficio</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="title">¿Qué necesitás?</label>
        <input
          id="title"
          name="title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="Ej: Arreglar una pérdida en la cocina"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">Detalle (opcional)</label>
        <textarea
          id="description"
          name="description"
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input min-h-24"
          placeholder="Contá el problema con el mayor detalle posible: así los presupuestos llegan más precisos."
        />
      </div>

      <label className="card p-4 flex items-start gap-3 cursor-pointer transition has-[:checked]:border-fg has-[:checked]:bg-surface-2">
        <input
          type="checkbox"
          name="urgent"
          checked={urgent}
          onChange={(e) => setUrgent(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-current shrink-0"
        />
        <span>
          <span className="block text-sm font-semibold">🚨 Lo necesito YA</span>
          <span className="block text-xs text-muted mt-0.5">
            Los profesionales lo ven primero y destacado. Se suma un {urgencyPct}% al presupuesto que elijas, que va
            íntegro al profesional. El pedido queda abierto 24 horas.
          </span>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="date">Fecha</label>
          <input id="date" name="date" type="date" required min={today} defaultValue={today} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="time">Horario</label>
          <select id="time" name="time" required defaultValue="09:00" className="input">
            {timeOptions.map((h) => (
              <option key={h} value={h}>{h} hs</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="zone">Barrio o localidad</label>
        <input id="zone" name="zone" required maxLength={80} className="input" placeholder="Ej: Palermo, CABA" />
        <p className="text-xs text-faint mt-1">Es lo que ven los profesionales para saber si les queda cerca.</p>
      </div>

      <div>
        <label className="label" htmlFor="address">Dirección exacta</label>
        <input id="address" name="address" required maxLength={200} className="input" placeholder="Calle y número" />
        <p className="text-xs text-faint mt-1">🔒 Sólo la ve el profesional que elijas.</p>
      </div>

      <div>
        <label className="label">Ubicación en el mapa</label>
        <p className="text-xs text-muted mb-2">Sirve para avisarle a los profesionales que trabajan en tu zona.</p>
        <LocationPicker />
      </div>

      <FormSubmitButton pendingLabel="Publicando pedido…">Publicar pedido</FormSubmitButton>
      <p className="text-xs text-faint text-center">
        Pagás recién cuando elegís un presupuesto, y el dinero queda protegido hasta que el trabajo esté terminado.
      </p>
    </form>
  );
}
