"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { PAYMENT_PROVIDERS, PAYOUT_PROVIDERS, type AccountPurpose } from "@/lib/payments/accounts";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary w-full">
      {pending ? "Guardando…" : "Vincular cuenta"}
    </button>
  );
}

/** Alta de una cuenta de pago (cliente) o de cobro (trabajador). */
export function PaymentAccountForm({
  purpose,
  action,
}: {
  purpose: AccountPurpose;
  action: (fd: FormData) => void | Promise<void>;
}) {
  const options = purpose === "PAYOUT" ? PAYOUT_PROVIDERS : PAYMENT_PROVIDERS;
  const [provider, setProvider] = useState(options[0].value);
  const selected = options.find((o) => o.value === provider) ?? options[0];
  const isCard = provider.startsWith("CARD");

  return (
    <form action={action} className="card p-5 space-y-4">
      <h3 className="font-semibold text-sm">
        {purpose === "PAYOUT" ? "Vincular cuenta de cobro" : "Vincular método de pago"}
      </h3>

      <input type="hidden" name="provider" value={provider} />
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setProvider(o.value)}
            aria-pressed={provider === o.value}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition text-left ${
              provider === o.value ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:border-fg/40"
            }`}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{selected.detailLabel}</label>
          <input
            name="detail"
            required
            className="input"
            placeholder={selected.detailPlaceholder}
            inputMode={isCard ? "numeric" : undefined}
            maxLength={isCard ? 4 : 60}
          />
        </div>
        <div>
          <label className="label">Titular</label>
          <input name="holder" className="input" placeholder="Nombre y apellido" />
        </div>
      </div>

      {isCard && (
        <div>
          <label className="label">Nombre para identificarla (opcional)</label>
          <input name="label" className="input" placeholder="Visa personal" />
        </div>
      )}

      <SubmitButton />
      <p className="text-xs text-faint">
        {isCard
          ? "Solo guardamos los últimos 4 dígitos. La vinculación completa se hará de forma segura con el proveedor de pagos."
          : "Estos datos se usan para acreditarte el dinero cuando se libere un pago."}
      </p>
    </form>
  );
}
