"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { requestTopUp } from "@/lib/actions/wallet";
import { TOPUP_PRESETS, MIN_TOPUP } from "@/lib/wallet";
import { formatMoney } from "@/lib/format";

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
        {pending ? "Enviando comprobante…" : "Enviar comprobante"}
      </span>
    </button>
  );
}

/** Carga de saldo: monto + comprobante de la transferencia. */
export function TopUpForm({ alias, blocked }: { alias: string; blocked: boolean }) {
  const [amount, setAmount] = useState(TOPUP_PRESETS[1]);
  const [fileName, setFileName] = useState<string | null>(null);

  if (blocked) {
    return (
      <div className="card p-5 mt-3 text-center">
        <p className="text-sm text-muted">
          Tenés una carga en revisión. Cuando la aprobemos vas a poder cargar más saldo.
        </p>
      </div>
    );
  }

  return (
    <form action={requestTopUp} className="card p-5 mt-3">
      <h2 className="font-semibold">Cargar saldo</h2>

      <div className="mt-4">
        <label htmlFor="amount" className="label">Monto a cargar</label>
        <div className="flex gap-2 flex-wrap">
          {TOPUP_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                amount === p ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-fg/40"
              }`}
            >
              {formatMoney(p)}
            </button>
          ))}
        </div>
        <div className="relative mt-2">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
          <input
            id="amount"
            name="amount"
            type="number"
            required
            min={MIN_TOPUP}
            step={500}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input pl-7"
          />
        </div>
        <p className="text-[11px] text-faint mt-1">Mínimo {formatMoney(MIN_TOPUP)}.</p>
      </div>

      <div className="rounded-xl border border-line p-3.5 mt-4">
        <p className="text-sm text-muted">
          Transferí <strong className="text-fg">{formatMoney(amount || 0)}</strong> al alias{" "}
          <strong className="text-fg">{alias}</strong> y subí la captura.
        </p>
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
    </form>
  );
}
