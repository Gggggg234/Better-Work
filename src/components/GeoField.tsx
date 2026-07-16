"use client";

import { useState } from "react";

/**
 * Inputs de latitud/longitud con botón "Usar mi ubicación".
 * Los valores viajan en el form como campos lat/lng.
 */
export function GeoField({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [coords, setCoords] = useState<{ lat: string; lng: string }>({
    lat: lat != null ? String(lat) : "",
    lng: lng != null ? String(lng) : "",
  });
  const [status, setStatus] = useState<string | null>(null);

  function locate() {
    if (!navigator.geolocation) {
      setStatus("Tu navegador no permite geolocalización.");
      return;
    }
    setStatus("Obteniendo ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        setStatus("Ubicación cargada ✓");
      },
      () => setStatus("No pudimos obtener tu ubicación. Cargala manualmente."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          name="lat"
          value={coords.lat}
          onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))}
          placeholder="Latitud"
          className="input"
          inputMode="decimal"
        />
        <input
          name="lng"
          value={coords.lng}
          onChange={(e) => setCoords((c) => ({ ...c, lng: e.target.value }))}
          placeholder="Longitud"
          className="input"
          inputMode="decimal"
        />
        <button type="button" onClick={locate} className="btn-secondary shrink-0">
          📍 Mi ubicación
        </button>
      </div>
      {status && <p className="text-xs text-muted mt-1.5">{status}</p>}
    </div>
  );
}
