"use client";

import { useRouter } from "next/navigation";

/**
 * Vuelve a la pantalla anterior conservando lo que ya se había cargado.
 *
 * Usa `router.back()` en vez de un enlace fijo: así el historial decide, el
 * formulario anterior conserva su estado y nadie termina en el inicio. Si no
 * hay historial (entró directo por URL o desde un email), cae en `fallback`
 * para no dejar un botón que no hace nada.
 */
export function BackButton({
  fallback = "/app",
  label = "Volver",
  className = "",
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function goBack() {
    // history.length es 1 cuando la pestaña se abrió directamente en esta URL
    // (por ejemplo desde un email): ahí `back()` no llevaría a ningún lado.
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`btn-ghost !px-2 -ml-2 !text-sm inline-flex items-center gap-1 ${className}`}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden>
        <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
