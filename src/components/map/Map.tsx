"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, AttributionControl, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import { TILE_URL, TILE_ATTRIBUTION, TILE_MAX_ZOOM } from "./tiles";
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
  /** Foto para el pin (si no hay, van las iniciales). */
  avatarUrl?: string | null;
  /** Para la vista previa al tocar el pin. */
  rating?: number;
  ratingCount?: number;
  pro?: boolean;
  zone?: string;
  categorySlug?: string | null;
  /** Acción principal de la vista previa (ej. contratar). */
  actionHref?: string;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Pin con foto o iniciales, estilo "persona en el mapa" (clases en globals.css). */
function icon(m: Pick<MapMarker, "kind" | "label" | "avatarUrl" | "rating" | "ratingCount">, active = false) {
  if (m.kind === "me") {
    return L.divIcon({ html: `<div class="bw-me"></div>`, className: "", iconSize: [18, 18], iconAnchor: [9, 9] });
  }
  if (m.kind === "job") {
    return L.divIcon({
      html: `<div class="bw-pin"><div class="bw-pin-head"><div class="bw-pin-face"><span style="filter:grayscale(1)">📍</span></div></div><div class="bw-pin-tail"></div></div>`,
      className: "",
      iconSize: [42, 50],
      iconAnchor: [21, 50],
    });
  }
  const mod = m.kind === "sponsored" ? " bw-pin--sponsored" : m.kind === "company" ? " bw-pin--company" : "";
  const face =
    m.kind === "company"
      ? "🏢"
      : m.avatarUrl
        ? `<img src="${esc(m.avatarUrl)}" alt="" loading="lazy" />`
        : esc(initials(m.label));
  const star =
    m.kind !== "company" && m.ratingCount && m.ratingCount > 0 && m.rating
      ? `<span class="bw-pin-star">★${m.rating.toFixed(1)}</span>`
      : "";
  return L.divIcon({
    html: `<div class="bw-pin${mod}${active ? " is-active" : ""}"><div class="bw-pin-head"><div class="bw-pin-face">${face}</div></div><div class="bw-pin-tail"></div>${star}</div>`,
    className: "",
    iconSize: [42, 50],
    iconAnchor: [21, 50],
  });
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
        map.flyTo(ll, 14, { duration: 0.8 });
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

/** Leaflet no se entera solo cuando cambia el tamaño del contenedor (pantalla completa, panel). */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/** Tocar el mapa (fuera de un pin) cierra la vista previa. */
function ClickAway({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick });
  return null;
}

export default function Map({
  center,
  zoom = 13,
  markers = [],
  className = "h-full w-full",
  locate = false,
  onSelect,
  selectedId,
  controlsClassName = "bottom-4 right-4",
}: {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  /** Muestra la ubicación del usuario, la centra al inicio y suma el botón. */
  locate?: boolean;
  /** Si está, tocar un pin lo selecciona (vista previa propia) en vez del globito. */
  onSelect?: (m: MapMarker | null) => void;
  selectedId?: string | null;
  /** Posición del botón "mi ubicación" (para no quedar debajo de paneles). */
  controlsClassName?: string;
}) {
  const dark = useIsDark();
  const mapRef = useRef<L.Map | null>(null);
  const [me, setMe] = useState<[number, number] | null>(null);

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
        className={`${className ?? ""} ${dark ? "map-dark" : ""}`}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={TILE_MAX_ZOOM} />
        <AttributionControl position="bottomright" prefix={false} />
        <AutoResize />
        {onSelect && <ClickAway onClick={() => onSelect(null)} />}
        {markers.map((m) =>
          onSelect ? (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={icon(m, selectedId === m.id)}
              zIndexOffset={selectedId === m.id ? 1000 : m.kind === "sponsored" ? 500 : 0}
              eventHandlers={{
                click: () => {
                  onSelect(m);
                  mapRef.current?.panTo([m.lat, m.lng], { animate: true });
                },
              }}
            />
          ) : (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={icon(m)}>
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
          )
        )}
        {locate && <AutoLocate onFix={setMe} />}
        {locate && me && <Marker position={me} icon={icon({ kind: "me", label: "" })} />}
      </MapContainer>

      {locate && (
        <button
          type="button"
          onClick={recenter}
          aria-label="Mi ubicación"
          title="Mi ubicación"
          className={`absolute ${controlsClassName} z-[600] w-12 h-12 rounded-2xl glass border border-line shadow-float flex items-center justify-center text-accent hover:scale-105 active:scale-95 transition`}
        >
          <LocateFixed className="w-5 h-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
