"use client";

import { useFormStatus } from "react-dom";
import { declarePayment, confirmReceived, rejectReceived } from "@/lib/actions/jobPayments";
import { CopyField } from "@/components/CopyField";
import { formatMoney } from "@/lib/format";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
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
        {pending ? pendingLabel : label}
      </span>
    </button>
  );
}

/**
 * El cliente avisa que transfirió (seña o saldo).
 *
 * El dinero va directo al alias del profesional: Better Work no lo recibe ni
 * lo retiene, sólo deja constancia para habilitar el paso siguiente.
 */
export function DeclarePaymentForm({
  jobId,
  kind,
  amount,
  alias,
  holder,
  workerName,
  isDeposit,
}: {
  jobId: string;
  kind: "DEPOSIT" | "FINAL";
  amount: number;
  alias: string | null;
  holder: string | null;
  workerName: string;
  isDeposit: boolean;
}) {
  return (
    <form action={declarePayment.bind(null, jobId, kind)} className="card p-5 border-fg">
      <p className="text-xs uppercase tracking-wide text-faint">
        {isDeposit ? "Seña para reservar el trabajo" : "Saldo final"}
      </p>
      <p className="text-2xl font-bold mt-0.5">{formatMoney(amount)}</p>
      <p className="text-sm text-muted mt-2">
        {isDeposit ? (
          <>
            Transferile la seña directamente a {workerName} para reservar el trabajo. Cuando la confirme, puede
            arrancar.
          </>
        ) : (
          <>El trabajo terminó. Pagale el saldo a {workerName} para cerrar.</>
        )}
      </p>

      {alias ? (
        <div className="mt-4 space-y-2">
          <CopyField label="Alias de destino" value={alias} />
          {holder && <CopyField label="Titular" value={holder} />}
        </div>
      ) : (
        <div className="card p-3.5 mt-4 bg-surface-2 !border-line">
          <p className="text-sm text-muted">
            {workerName} todavía no cargó su alias de cobro. Coordinen el pago por chat y después marcá que lo
            hiciste.
          </p>
        </div>
      )}

      <label className="block mt-4">
        <span className="label">Referencia (opcional)</span>
        <input
          name="note"
          maxLength={120}
          placeholder="Ej: transferencia desde Banco Nación"
          className="input !py-2 !text-sm"
        />
      </label>

      <Submit
        label={isDeposit ? "Ya transferí la seña" : "Ya pagué el saldo"}
        pendingLabel="Registrando…"
      />

      <p className="text-[11px] text-faint mt-3">
        Better Work no recibe este dinero: va directo a {workerName}. Sólo dejamos constancia.
      </p>
    </form>
  );
}

/** El trabajador confirma (o niega) haber recibido el dinero. */
export function ConfirmReceivedForm({
  jobId,
  kind,
  amount,
  isDeposit,
  clientName,
  note,
}: {
  jobId: string;
  kind: "DEPOSIT" | "FINAL";
  amount: number;
  isDeposit: boolean;
  clientName: string;
  note?: string;
}) {
  return (
    <div className="card p-5 border-fg">
      <p className="text-xs uppercase tracking-wide text-faint">
        {isDeposit ? "Seña declarada por el cliente" : "Saldo declarado por el cliente"}
      </p>
      <p className="text-2xl font-bold mt-0.5">{formatMoney(amount)}</p>
      <p className="text-sm text-muted mt-2">
        {clientName} marcó que ya te transfirió. Revisá tu cuenta y confirmá.
        {isDeposit && " Al confirmar vas a poder iniciar el trabajo."}
      </p>
      {note && <p className="text-xs text-faint mt-2">Referencia: {note}</p>}

      <div className="flex gap-2 mt-4">
        <form action={confirmReceived.bind(null, jobId, kind)} className="flex-1">
          <button className="btn-primary w-full !py-2.5 !text-sm">Sí, lo recibí</button>
        </form>
        <form action={rejectReceived.bind(null, jobId, kind)} className="flex-1">
          <button className="btn-secondary w-full !py-2.5 !text-sm text-red-600">No me llegó</button>
        </form>
      </div>
    </div>
  );
}
