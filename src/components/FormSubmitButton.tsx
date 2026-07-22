"use client";

import { useFormStatus } from "react-dom";

/**
 * Botón de envío para formularios con Server Actions.
 *
 * Usa `useFormStatus`: mientras la acción corre, muestra un spinner y se
 * deshabilita solo. Así el usuario ve que algo pasa y no puede apretar dos
 * veces (evita solicitudes duplicadas).
 */
export function FormSubmitButton({
  children,
  pendingLabel,
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`btn-primary w-full !py-3.5 ${className}`} aria-busy={pending}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending && (
          <span
            aria-hidden
            className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        )}
        {pending ? pendingLabel : children}
      </span>
    </button>
  );
}
