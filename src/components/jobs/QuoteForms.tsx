"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { sendQuote, acceptQuote, rejectQuote, requestQuoteChanges } from "@/lib/actions/quotes";
import { formatMoney } from "@/lib/format";

function Submit({ children, pendingLabel, variant = "primary" }: { children: React.ReactNode; pendingLabel: string; variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`btn-${variant} w-full !py-2.5 !text-sm`} aria-busy={pending}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending && <span aria-hidden className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
        {pending ? pendingLabel : children}
      </span>
    </button>
  );
}

/** El trabajador arma y envía su presupuesto. */
export function SendQuoteForm({ jobId, changeNote }: { jobId: string; changeNote?: string }) {
  return (
    <form action={sendQuote.bind(null, jobId)} className="card p-5 border-fg space-y-3">
      <div>
        <p className="font-semibold text-sm">{changeNote ? "Enviá un nuevo presupuesto" : "Pasá tu presupuesto"}</p>
        <p className="text-xs text-muted mt-0.5">
          El cliente lo va a poder aceptar, rechazar o pedirte cambios. El precio no es automático: lo ponés vos.
        </p>
      </div>

      {changeNote && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-[11px] font-medium text-fg">El cliente pidió cambios:</p>
          <p className="text-xs text-muted mt-0.5">{changeNote}</p>
        </div>
      )}

      <div>
        <label className="label">Precio</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
          <input name="price" type="number" required min="1" step="1" className="input pl-7" placeholder="0" />
        </div>
      </div>

      <div>
        <label className="label">Tiempo estimado</label>
        <input name="estimatedTime" className="input" placeholder="Ej: 2 días, media jornada" maxLength={80} />
      </div>

      <div>
        <label className="label">Observaciones (opcional)</label>
        <textarea
          name="note"
          className="input min-h-20"
          placeholder="Materiales incluidos, condiciones, aclaraciones…"
          maxLength={500}
        />
      </div>

      <Submit pendingLabel="Enviando…">Enviar presupuesto</Submit>
    </form>
  );
}

/** El cliente revisa el presupuesto: aceptar, pedir cambios o rechazar. */
export function QuoteReview({
  jobId,
  quote,
  workerName,
}: {
  jobId: string;
  quote: { id: string; price: number; estimatedTime: string; note: string };
  workerName: string;
}) {
  const [changing, setChanging] = useState(false);

  return (
    <div className="card p-5 border-fg">
      <p className="text-xs uppercase tracking-wide text-faint">Presupuesto de {workerName}</p>
      <p className="text-2xl font-bold mt-0.5">{formatMoney(quote.price)}</p>
      {quote.estimatedTime && <p className="text-sm text-muted mt-1">Tiempo estimado: {quote.estimatedTime}</p>}
      {quote.note && <p className="text-sm text-muted mt-2 whitespace-pre-line">{quote.note}</p>}

      {!changing ? (
        <div className="space-y-2 mt-4">
          <form action={acceptQuote.bind(null, jobId, quote.id)}>
            <Submit pendingLabel="Aceptando…">Aceptar y continuar al pago</Submit>
          </form>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChanging(true)}
              className="btn-secondary flex-1 !py-2.5 !text-sm"
            >
              Pedir cambios
            </button>
            <form action={rejectQuote.bind(null, jobId, quote.id)} className="flex-1 flex">
              <button className="btn-ghost flex-1 !py-2.5 !text-sm text-red-600">Rechazar</button>
            </form>
          </div>
        </div>
      ) : (
        <form action={requestQuoteChanges.bind(null, jobId, quote.id)} className="mt-4 space-y-2">
          <label className="label">¿Qué querés que ajuste?</label>
          <textarea
            name="clientNote"
            required
            className="input min-h-20"
            placeholder="Ej: ¿podés bajar el precio? ¿incluís los materiales?"
            maxLength={400}
          />
          <div className="flex gap-2">
            <Submit pendingLabel="Enviando…" variant="secondary">Pedir cambios</Submit>
            <button type="button" onClick={() => setChanging(false)} className="btn-ghost !py-2.5 !px-3 !text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <p className="text-[11px] text-faint mt-3">
        Al aceptar vas a pagar {formatMoney(quote.price)}, que queda retenido por Better Work hasta que confirmes el
        final del trabajo.
      </p>
    </div>
  );
}
