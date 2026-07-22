"use client";

import { useFormStatus } from "react-dom";
import { startPayment } from "@/lib/actions/jobPayments";
import { formatMoney } from "@/lib/format";

function Submit({ mpReady, amount }: { mpReady: boolean; amount: number }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary w-full mt-4 !py-3" aria-busy={pending}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending && (
          <span
            aria-hidden
            className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        )}
        {pending
          ? "Redirigiendo al pago…"
          : mpReady
            ? `Pagar ${formatMoney(amount)} con Mercado Pago`
            : `Pagar ${formatMoney(amount)}`}
      </span>
    </button>
  );
}

/**
 * Pago del trabajo con dinero retenido (escrow).
 *
 * Better Work retiene el pago y se lo libera al profesional recién cuando el
 * cliente confirma el código de finalización. Con Mercado Pago configurado, el
 * botón lleva al checkout; sin credenciales, el proveedor simulado retiene al
 * instante para poder probar el flujo.
 */
export function PayButton({
  jobId,
  amount,
  workerName,
  mpReady,
}: {
  jobId: string;
  amount: number;
  workerName: string;
  mpReady: boolean;
}) {
  return (
    <form action={startPayment.bind(null, jobId)} className="card p-5 border-fg">
      <p className="text-xs uppercase tracking-wide text-faint">Pago protegido</p>
      <p className="text-2xl font-bold mt-0.5">{formatMoney(amount)}</p>
      <p className="text-sm text-muted mt-2">
        {workerName} aceptó el trabajo. Al pagar, el dinero queda <strong className="text-fg">retenido por
        Better Work</strong> y se le libera <strong className="text-fg">recién cuando vos confirmes</strong> que el
        trabajo terminó.
      </p>

      <ol className="space-y-2 text-sm mt-4">
        {[
          "Pagás ahora; el dinero queda protegido.",
          "El profesional puede arrancar el trabajo.",
          "Al terminar, le pasás el código de finalización.",
          "Ahí se libera el pago (menos la comisión).",
        ].map((step, i) => (
          <li key={step} className="flex gap-2.5">
            <span className="w-5 h-5 rounded-full bg-fg text-bg text-[11px] font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="text-muted">{step}</span>
          </li>
        ))}
      </ol>

      <Submit mpReady={mpReady} amount={amount} />

      <p className="text-[11px] text-faint mt-3">
        {mpReady
          ? "Vas a completar el pago en Mercado Pago y volvés a esta pantalla."
          : "Modo de prueba: sin pasarela configurada, el pago se retiene al instante para probar el flujo."}
        {" "}Si el trabajo se cancela antes de empezar, te devolvemos el dinero.
      </p>
    </form>
  );
}
