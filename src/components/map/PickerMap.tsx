"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function useIsDark() {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", onChange);
    const obs = new MutationObserver(onChange);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", onChange);
      obs.disconnect();
    };
  }, []);
  const getSnapshot = useCallback(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

const pinIcon = L.divIcon({
  html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:#000;color:#fff;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.3);">📍</div>`,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

/** Traduce un toque en el mapa a una coordenada. */
function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

/**
 * Mapa interactivo para elegir la ubicación de un servicio.
 *
 * El cliente toca cualquier punto o arrastra el pin; el botón "Mi ubicación"
 * lo lleva a dónde está parado. La coordenada elegida sube al padre, que la
 * guarda en el formulario.
 */
export default function PickerMap({
  value,
  center,
  onChange,
}: {
  value: [number, number] | null;
  center: [number, number];
  onChange: (lat: number, lng: number) => void;
}) {
  const dark = useIsDark();
  const mapRef = useRef<L.Map | null>(null);

  const tiles = dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  function locateMe() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onChange(lat, lng);
        mapRef.current?.flyTo([lat, lng], 16, { duration: 0.8 });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        ref={mapRef}
        center={value ?? center}
        zoom={value ? 16 : 13}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer key={dark ? "dark" : "light"} url={tiles} />
        <ClickToPlace onPick={onChange} />
        {value && (
          <Marker
            position={value}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = e.target.getLatLng();
                onChange(ll.lat, ll.lng);
              },
            }}
          />
        )}
      </MapContainer>

      <button
        type="button"
        onClick={locateMe}
        aria-label="Usar mi ubicación"
        title="Usar mi ubicación"
        className="absolute bottom-3 right-3 z-[600] w-10 h-10 rounded-full bg-surface border border-line shadow-lg flex items-center justify-center hover:bg-surface-2 transition"
      >
        📍
      </button>
    </div>
  );
}
