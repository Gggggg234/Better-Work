"use client";

import { useState } from "react";
import { MapView } from "./MapView";
import type { MapMarker } from "./Map";
import { PinPreview } from "@/components/home/HomeMap";

/** Mapa grande de resultados: tocar un pin muestra la tarjeta del profesional. */
export function ResultsMap({ markers, center }: { markers: MapMarker[]; center: [number, number] }) {
  const [selected, setSelected] = useState<MapMarker | null>(null);
  return (
    <div className="relative h-full w-full">
      <MapView center={center} zoom={12} markers={markers} locate onSelect={setSelected} selectedId={selected?.id} controlsClassName="top-3 right-3" />
      {selected && (
        <div className="absolute inset-x-3 bottom-3 z-[900] animate-pop-in">
          <PinPreview m={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
