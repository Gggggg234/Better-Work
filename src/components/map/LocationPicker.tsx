"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PickerMap = dynamic(() => import("./PickerMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-2 animate-pulse" />,
});

const BA_CENTER: [number, number] = [-34.6037, -58.3816];

/**
 * Selector de ubicación del servicio para el formulario de contratación.
 *
 * Abre un mapa, muestra la ubicación del cliente, deja tocar o arrastrar el pin
 * y guarda la coordenada elegida en los campos `lat`/`lng` del formulario. El
 * trabajador la ve después en el mapa del trabajo, así sabe exactamente a dónde
 * ir. La dirección escrita en texto acompaña a esta coordenada.
 */
export function LocationPicker({
  lat,
  lng,
}: {
  lat?: number | null;
  lng?: number | null;
}) {
  const [point, setPoint] = useState<[number, number] | null>(
    lat != null && lng != null ? [lat, lng] : null
  );

  // Al abrir sin punto previo, ofrecemos centrar en la ubicación actual.
  useEffect(() => {
    if (point || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPoint([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
    // Sólo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Campos que viajan en el form */}
      <input type="hidden" name="lat" value={point ? point[0].toFixed(6) : ""} />
      <input type="hidden" name="lng" value={point ? point[1].toFixed(6) : ""} />

      <div className="h-56 rounded-2xl overflow-hidden border border-line">
        <PickerMap
          value={point}
          center={BA_CENTER}
          onChange={(la, ln) => setPoint([la, ln])}
        />
      </div>

      <p className="text-xs text-muted mt-1.5">
        {point ? (
          <>✓ Ubicación marcada. Tocá el mapa o arrastrá el pin para ajustarla.</>
        ) : (
          <>Tocá el mapa para marcar dónde se hará el trabajo, o usá el botón 📍 para tu ubicación.</>
        )}
      </p>
    </div>
  );
}
