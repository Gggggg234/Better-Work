"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/lib/actions/auth";
import { Field, Notice, PasswordInput, SubmitButton } from "@/components/auth/AuthUI";

/** Baja de cuenta desde el perfil. Colapsado hasta que se necesita. */
export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, undefined);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full text-danger">
        Eliminar cuenta
      </button>
    );
  }

  return (
    <form action={action} className="card p-5 space-y-3 !border-danger/30">
      <h3 className="font-semibold text-sm text-danger">Eliminar cuenta</h3>
      <p className="text-xs text-muted">
        Esto borra tu cuenta y tu perfil para siempre. Si ya tenés trabajos, pagos, mensajes o reseñas, no podemos
        borrarla automáticamente: escribinos a soporte para darla de baja.
      </p>

      {state?.error && <Notice kind="error">{state.error}</Notice>}

      {hasPassword && (
        <Field label="Contraseña" name="password" error={state?.fields?.password}>
          <PasswordInput name="password" invalid={!!state?.fields?.password} />
        </Field>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cancelar</button>
        <SubmitButton pending={pending} pendingLabel="Eliminando…" className="flex-1 !py-2.5 !bg-danger">
          Sí, eliminar mi cuenta
        </SubmitButton>
      </div>
    </form>
  );
}
