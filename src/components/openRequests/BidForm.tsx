"use client";

import { useFormStatus } from "react-dom";
import { sendBid } from "@/lib/actions/openRequests";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary w-full !py-2.5 !text-sm" aria-busy={pending}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending && <span aria-hidden className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
        {pending ? "Enviando…" : label}
      </span>
    </button>
  );
}

/** El profesional cotiza un pedido abierto (o actualiza su cotización). */
export function BidForm({
  requestId,
  current,
  urgencyPct,
  commissionPct,
  escrow = false,
}: {
  requestId: string;
  current?: { price: number; estimatedTime: string; note: string } | null;
  urgencyPct: number;
  commissionPct: number;
  /** Pago protegido activo (si no, el cliente le paga directo al profesional). */
  escrow?: boolean;
}) {
  return (
    <form action={sendBid.bind(null, requestId)} className="card p-5 border-fg space-y-3">
      <div>
        <p className="font-semibold text-sm">{current ? "Actualizá tu presupuesto" : "Pasá tu presupuesto"}</p>
        <p className="text-xs text-muted mt-0.5">
          El cliente compara los presupuestos y elige uno. Los demás profesionales no ven tu precio.{" "}
          {escrow
            ? `Al terminar cobrás el presupuesto menos la comisión de Better Work (${commissionPct}%).`
            : "Si te elige, te paga directo al terminar: Better Work no cobra comisión."}
        </p>
      </div>

      {urgencyPct > 0 && (
        <div className="rounded-xl bg-fg text-bg p-3">
          <p className="text-sm font-semibold">🚨 Pedido urgente</p>
          <p className="text-xs text-bg/70 mt-0.5">
            Si te eligen, a tu presupuesto se le suma un {urgencyPct}% extra para vos.
          </p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="bid-price">Precio</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
          <input
            id="bid-price"
            name="price"
            type="number"
            required
            min="1"
            step="1"
            defaultValue={current?.price}
            className="input pl-7"
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="bid-time">Tiempo estimado</label>
        <input
          id="bid-time"
          name="estimatedTime"
          defaultValue={current?.estimatedTime}
          className="input"
          placeholder="Ej: 2 horas, 3 días"
          maxLength={80}
        />
      </div>

      <div>
        <label className="label" htmlFor="bid-note">Observaciones (opcional)</label>
        <textarea
          id="bid-note"
          name="note"
          defaultValue={current?.note}
          className="input min-h-20"
          placeholder="Materiales incluidos, disponibilidad, garantía…"
          maxLength={500}
        />
      </div>

      <Submit label={current ? "Actualizar presupuesto" : "Enviar presupuesto"} />
    </form>
  );
}
