"use client";

import { useState } from "react";

/**
 * Rechazo con motivo.
 *
 * Se pide el motivo porque se le manda a la empresa: un rechazo sin
 * explicación garantiza que vuelvan a subir el mismo comprobante.
 */
export function RejectRequest({
  requestId,
  action,
}: {
  requestId: string;
  action: (id: string, formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary flex-1 !py-2.5 !text-sm text-red-600">
        Rechazar
      </button>
    );
  }

  return (
    <form action={action.bind(null, requestId)} className="w-full mt-1 space-y-2">
      <label className="label !mb-1">Motivo del rechazo</label>
      <input
        name="note"
        autoFocus
        maxLength={300}
        placeholder="Ej: el importe no coincide con el plan"
        className="input !py-2 !text-sm"
      />
      <div className="flex gap-2">
        <button className="btn-secondary flex-1 !py-2 !text-sm text-red-600">Confirmar rechazo</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-2 !px-3 !text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
