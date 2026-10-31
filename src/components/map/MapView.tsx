"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type MapType from "./Map";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-2 animate-pulse rounded-[inherit]" />,
});

export function MapView(props: ComponentProps<typeof MapType>) {
  return <Map {...props} />;
}
