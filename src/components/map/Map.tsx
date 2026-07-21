"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

/**
 * Detecta el tema activo (explícito o del sistema) y reacciona a cambios.
 *
 * El tema vive fuera de React (atributo del <html> + preferencia del sistema),
 * así que lo leemos con useSyncExternalStore en lugar de copiarlo a estado.
 */
function subscribeToTheme(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    mq.removeEventListener("change", onChange);
    obs.disconnect();
  };
}

function useIsDark() {
  const getSnapshot = useCallback(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }, []);
  // En el servidor asumimos claro; el cliente corrige al hidratar.
  return useSyncExternalStore(subscribeToTheme, getSnapshot, () => false);
}

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  href?: string;
  kind?: "worker" | "company" | "sponsored" | "me" | "job";
};

function icon(kind: MapMarker["kind"]) {
  const base =
    "display:flex;align-items:center;justify-content:center;border-radius:9999px;box-shadow:0 2px 8px rgba(0,0,0,.25);";
  let html = "";
  if (kind === "company") {
    html = `<div style="${base}width:30px;height:30px;background:#fff;border:2px solid #000;font-size:13px;">🏢</div>`;
  } else if (kind === "sponsored") {
    html = `<div style="${base}width:34px;height:34px;background:#000;border:3px solid #fff;outline:2px solid #000;color:#fff;font-size:14px;">★</div>`;
  } else if (kind === "me") {
    // Punto azul con halo, estilo "mi ubicación".
    html = `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:34px;height:34px;border-radius:9999px;background:rgba(37,99,235,.2);"></div>
      <div style="${base}width:16px;height:16px;background:#2563eb;border:3px solid #fff;"></div>
    </div>`;
  } else if (kind === "job") {
    html = `<div style="${base}width:30px;height:30px;background:#000;color:#fff;font-size:13px;">📍</div>`;
  } else {
    html = `<div style="${base}width:26px;height:26px;background:#000;border:2px solid #fff;color:#fff;font-size:11px;font-weight:700;">●</div>`;
  }
  return L.divIcon({ html, className: "", iconSize: [34, 34], iconAnchor: [17, 17] });
}

/**
 * Pide la ubicación una vez al montar (permiso "mientras se usa") y centra el
 * mapa la primera vez. Vive dentro del MapContainer para tener el mapa por
 * `useMap()`, y avisa la posición al padre para el marcador y el botón.
 */
function AutoLocate({ onFix }: { onFix: (ll: [number, number]) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        onFix(ll);
        map.flyTo(ll, 15, { duration: 0.8 });
      },
      () => {
        /* permiso denegado: se queda en el centro por defecto */
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
    // Sólo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

export default function Map({
  center,
  zoom = 13,
  markers = [],
  className = "h-full w-full",
  locate = false,
}: {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  /** Muestra la ubicación del usuario, la centra al inicio y suma el botón. */
  locate?: boolean;
}) {
  const dark = useIsDark();
  const mapRef = useRef<L.Map | null>(null);
  const [me, setMe] = useState<[number, number] | null>(null);

  const tiles = dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  /** Vuelve a mi ubicación (o la pide si todavía no la tengo). */
  function recenter() {
    if (me) {
      mapRef.current?.flyTo(me, 15, { duration: 0.8 });
      return;
    }
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMe(ll);
        mapRef.current?.flyTo(ll, 15, { duration: 0.8 });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        className={className}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer key={dark ? "dark" : "light"} url={tiles} />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icon(m.kind)}>
            <Popup>
              <div className="min-w-[140px]">
                <p className="font-semibold text-sm m-0">{m.label}</p>
                {m.sublabel && <p className="text-xs text-muted m-0">{m.sublabel}</p>}
                {m.href && (
                  <Link href={m.href} className="text-xs font-medium underline">
                    Ver perfil
                  </Link>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {locate && <AutoLocate onFix={setMe} />}
        {locate && me && <Marker position={me} icon={icon("me")} />}
      </MapContainer>

      {locate && (
        <button
          type="button"
          onClick={recenter}
          aria-label="Mi ubicación"
          title="Mi ubicación"
          className="absolute bottom-4 right-4 z-[600] w-11 h-11 rounded-full bg-surface border border-line shadow-lg flex items-center justify-center text-lg hover:bg-surface-2 transition"
        >
          📍
        </button>
      )}
    </div>
  );
}
