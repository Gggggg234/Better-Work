"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { payJob } from "@/lib/actions/escrow";
import { CopyField } from "@/components/CopyField";
import { formatMoney } from "@/lib/format";

const ERRORS: Record<string, string> = {
  comprobante: "Adjuntá el comprobante de la transferencia.",
  archivo: "No pudimos leer ese archivo. Subí una imagen (JPG, PNG o WEBP) de hasta 8 MB.",
  estado: "El trabajo ya no está en una etapa donde se pueda pagar.",
  sinprecio: "El trabajo todavía no tiene un precio acordado.",
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary w-full mt-3 !py-3">
      <span className="inline-flex items-center justify-center gap-2">
        {pending && (
          <span
            aria-hidden
            className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        )}
        {pending ? "Enviando comprobante…" : "Ya transferí, enviar comprobante"}
      </span>
    </button>
  );
}

/**
 * Pago del trabajo con dinero retenido.
 *
 * Se le explica al cliente que el dinero NO va directo al profesional: queda
 * protegido hasta que él mismo confirme el código de finalización. Es la parte
 * que sostiene la confianza del circuito.
 */
export function JobPaymentForm({
  jobId,
  amount,
  alias,
  holder,
  workerName,
  error,
}: {
  jobId: string;
  amount: number;
  alias: string;
  holder: string;
  workerName: string;
  error?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form action={payJob.bind(null, jobId)} className="card p-5 border-fg">
      <p className="text-xs uppercase tracking-wide text-faint">Pago protegido</p>
      <p className="text-2xl font-bold mt-0.5">{formatMoney(amount)}</p>
      <p className="text-sm text-muted mt-2">
        {workerName} aceptó el trabajo. Para que pueda empezar, el pago queda retenido por Better Work y se le
        libera <strong className="text-fg">recién cuando vos confirmes</strong> que el trabajo terminó.
      </p>

      {error && ERRORS[error] && (
        <p className="text-sm text-red-600 mt-3" role="alert">⚠ {ERRORS[error]}</p>
      )}

      <ol className="space-y-2 text-sm mt-4">
        {[
          `Transferí ${formatMoney(amount)} al alias de Better Work.`,
          "Subí el comprobante acá.",
          "Cuando lo validemos, el profesional puede arrancar.",
          "Al terminar, le pasás el código de finalización y ahí cobra.",
        ].map((step, i) => (
          <li key={step} className="flex gap-2.5">
            <span className="w-5 h-5 rounded-full bg-fg text-bg text-[11px] font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="text-muted">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 space-y-2">
        <CopyField label="Alias" value={alias} />
        {holder && <CopyField label="Titular" value={holder} />}
      </div>

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

      <Submit />

      <p className="text-[11px] text-faint mt-3">
        Si el trabajo se cancela antes de empezar, te devolvemos el dinero.
      </p>
    </form>
  );
}
