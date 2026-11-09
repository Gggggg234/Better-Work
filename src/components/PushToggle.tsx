"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription } from "@/lib/actions/notifications";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "busy";

/** La clave VAPID viaja en base64url; el navegador la quiere en bytes. */
function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * Activar / desactivar las notificaciones push en este dispositivo.
 * `compact`: tarjeta para el inicio que sólo aparece si todavía no están activas.
 */
export function PushToggle({ publicKey, compact = false }: { publicKey: string; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        // En iPhone, Web Push sólo existe con la app instalada en la pantalla de inicio.
        setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
      const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
    } finally {
      setState("off");
    }
  }

  // En el inicio sólo se ofrece mientras haga falta.
  if (compact && (state === "loading" || state === "on" || state === "unsupported" || state === "denied")) return null;

  const text: Record<State, string> = {
    loading: "",
    unsupported: "Este navegador no permite notificaciones. Probá desde Chrome o instalando la app.",
    "ios-install": "En iPhone, primero instalá la app: tocá Compartir → “Agregar a inicio”, y abrila desde ahí.",
    denied: "Bloqueaste las notificaciones. Habilitalas desde la configuración del navegador para este sitio.",
    off: "Enterate al instante de pedidos, presupuestos y mensajes, aunque no tengas la app abierta.",
    on: "Las notificaciones están activadas en este dispositivo.",
    busy: "",
  };

  return (
    <div className="card p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-sm">{state === "on" ? "Notificaciones activadas" : "Activá las notificaciones"}</p>
        {text[state] && <p className="text-xs text-muted mt-0.5">{text[state]}</p>}
      </div>
      {(state === "off" || state === "busy") && (
        <button onClick={enable} disabled={state === "busy"} className="btn-primary !py-2 !px-3 !text-xs shrink-0">
          {state === "busy" ? "Activando…" : "Activar"}
        </button>
      )}
      {state === "on" && !compact && (
        <button onClick={disable} className="btn-ghost !py-2 !px-3 !text-xs shrink-0">
          Desactivar
        </button>
      )}
    </div>
  );
}
