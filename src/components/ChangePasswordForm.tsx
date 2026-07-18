"use client";

import { useActionState, useState } from "react";
import { changePassword } from "@/lib/actions/auth";
import { Field, Notice, PasswordInput, PasswordStrength, SubmitButton } from "@/components/auth/AuthUI";

/** Cambio de contraseña desde el perfil. Colapsado hasta que se necesita. */
export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(changePassword, undefined);
  const [next, setNext] = useState("");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary w-full">
        Cambiar contraseña
      </button>
    );
  }

  return (
    <form action={action} className="card p-5 space-y-3">
      <h3 className="font-semibold text-sm">Cambiar contraseña</h3>

      {state?.error && <Notice kind="error">{state.error}</Notice>}
      {state?.ok && <Notice kind="ok">{state.ok}</Notice>}

      <Field label="Contraseña actual" name="current" error={state?.fields?.current}>
        <PasswordInput name="current" invalid={!!state?.fields?.current} />
      </Field>

      <div>
        <Field label="Nueva contraseña" name="next" error={state?.fields?.next}>
          <PasswordInput
            name="next"
            autoComplete="new-password"
            value={next}
            onChange={setNext}
            invalid={!!state?.fields?.next}
          />
        </Field>
        <PasswordStrength value={next} />
      </div>

      <Field label="Repetir contraseña nueva" name="confirm" error={state?.fields?.confirm}>
        <PasswordInput name="confirm" autoComplete="new-password" invalid={!!state?.fields?.confirm} />
      </Field>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cerrar</button>
        <SubmitButton pending={pending} pendingLabel="Guardando…" className="flex-1 !py-2.5">Guardar</SubmitButton>
      </div>
    </form>
  );
}
