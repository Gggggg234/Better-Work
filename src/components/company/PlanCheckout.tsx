"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { requestPlan } from "@/lib/actions/monetize";
import { formatMoney } from "@/lib/format";

function SubmitReceipt({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={disabled || pending} className="btn-primary w-full mt-3 !py-3">
      <span className="inline-flex items-center justify-center gap-2">
        {pending && (
          <span
            aria-hidden
            className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        )}
        {pending ? "Enviando comprobante…" : "Enviar comprobante"}
      </span>
    </button>
  );
}

/**
 * Paso de pago del plan: se despliega al elegirlo para no llenar la pantalla
 * con tres formularios de subida a la vez.
 */
export function PlanCheckout({
  planKey,
  planName,
  price,
  alias,
  blocked,
  label,
}: {
  planKey: string;
  planName: string;
  price: number;
  alias: string;
  blocked: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  if (blocked) {
    return (
      <button disabled className="btn-secondary w-full mt-4 opacity-60 cursor-not-allowed">
        Tenés un comprobante en revisión
      </button>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full mt-4">
        {label}
      </button>
    );
  }

  return (
    <form action={requestPlan} className="mt-4 rounded-xl border border-line p-4">
      <input type="hidden" name="planKey" value={planKey} />

      <ol className="space-y-2 text-sm">
        <li className="flex gap-2.5">
          <span className="w-5 h-5 rounded-full bg-fg text-bg text-[11px] font-bold flex items-center justify-center shrink-0">
            1
          </span>
          <span className="text-muted">
            Transferí <strong className="text-fg">{formatMoney(price)}</strong> al alias{" "}
            <strong className="text-fg">{alias}</strong>.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span className="w-5 h-5 rounded-full bg-fg text-bg text-[11px] font-bold flex items-center justify-center shrink-0">
            2
          </span>
          <span className="text-muted">Subí la captura del comprobante.</span>
        </li>
      </ol>

      <label className="block mt-4">
        <span className="label">Comprobante de la transferencia</span>
        <input
          type="file"
          name="receipt"
          required
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-fg file:px-3 file:py-2 file:text-xs file:font-medium file:text-bg hover:file:opacity-90"
        />
        <span className="block text-[11px] text-faint mt-1.5">
          {fileName ? `Seleccionado: ${fileName}` : "Imagen JPG, PNG o WEBP de hasta 8 MB."}
        </span>
      </label>

      <SubmitReceipt disabled={false} />
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost w-full mt-1 !py-2 !text-xs">
        Cancelar
      </button>

      <p className="text-[11px] text-faint mt-3">
        El plan {planName} se activa cuando un administrador valide el pago. Te avisamos por email.
      </p>
    </form>
  );
}
