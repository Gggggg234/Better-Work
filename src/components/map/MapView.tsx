"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "./Map";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-2 animate-pulse rounded-[inherit]" />,
});

export function MapView(props: {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
}) {
  return <Map {...props} />;
}
