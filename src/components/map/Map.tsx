"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

/** Detecta el tema activo (explícito o del sistema) y reacciona a cambios. */
function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const compute = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark") return true;
      if (attr === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };
    setDark(compute());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => setDark(compute());
    mq.addEventListener("change", onMq);
    const obs = new MutationObserver(() => setDark(compute()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", onMq);
      obs.disconnect();
    };
  }, []);
  return dark;
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
    html = `<div style="${base}width:18px;height:18px;background:#2563eb;border:3px solid #fff;"></div>`;
  } else if (kind === "job") {
    html = `<div style="${base}width:30px;height:30px;background:#000;color:#fff;font-size:13px;">📍</div>`;
  } else {
    html = `<div style="${base}width:26px;height:26px;background:#000;border:2px solid #fff;color:#fff;font-size:11px;font-weight:700;">●</div>`;
  }
  return L.divIcon({ html, className: "", iconSize: [30, 30], iconAnchor: [15, 15] });
}

export default function Map({
  center,
  zoom = 13,
  markers = [],
  className = "h-full w-full",
}: {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
}) {
  const dark = useIsDark();
  const tiles = dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  return (
    <MapContainer center={center} zoom={zoom} className={className} zoomControl={false} attributionControl={false}>
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
    </MapContainer>
  );
}
