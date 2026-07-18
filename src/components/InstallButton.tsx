"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function subscribeToInstall(onChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Botón "Descargar aplicación" para instalar la PWA. Sólo se muestra cuando el
 * dispositivo lo permite y la app todavía no está instalada.
 */
export function InstallButton({ className = "" }: { className?: string }) {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  // Que la app ya esté instalada es estado del navegador, no de React.
  const standalone = useSyncExternalStore(subscribeToInstall, isStandalone, () => false);
  const [installedNow, setInstalledNow] = useState(false);
  const installed = standalone || installedNow;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalledNow(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !prompt) return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  return (
    <button onClick={install} className={`btn-secondary ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
      </svg>
      Descargar aplicación
    </button>
  );
}
