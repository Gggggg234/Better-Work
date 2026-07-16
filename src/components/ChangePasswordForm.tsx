"use client";

import { useActionState, useState } from "react";
import { changePassword } from "@/lib/actions/auth";

/** Cambio de contraseña desde el perfil. Colapsado hasta que se necesita. */
export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(changePassword, undefined);

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
      <div>
        <label className="label">Contraseña actual</label>
        <input name="current" type="password" required className="input" autoComplete="current-password" />
      </div>
      <div>
        <label className="label">Nueva contraseña</label>
        <input name="next" type="password" required minLength={8} className="input" autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-fg font-medium">✓ {state.ok}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cerrar</button>
        <button disabled={pending} className="btn-primary flex-1">{pending ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}
