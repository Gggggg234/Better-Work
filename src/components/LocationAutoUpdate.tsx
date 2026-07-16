"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Obtiene la ubicación actual (sólo mientras la app está abierta) y actualiza
 * la búsqueda automáticamente para ordenar por cercanía. No usa seguimiento en
 * segundo plano: una sola lectura puntual con permiso "mientras se usa".
 */
export function LocationAutoUpdate() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (params.has("lat") && params.has("lng")) return;
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = new URLSearchParams(Array.from(params.entries()));
        next.set("lat", pos.coords.latitude.toFixed(6));
        next.set("lng", pos.coords.longitude.toFixed(6));
        if (!next.get("sort")) next.set("sort", "distance");
        router.replace(`/search?${next.toString()}`, { scroll: false });
      },
      () => {
        /* permiso denegado: la búsqueda sigue con el orden por defecto */
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
    // Sólo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
