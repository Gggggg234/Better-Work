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

/** Instrucciones por plataforma, para cuando el navegador no ofrece el diálogo. */
function manualSteps(): { title: string; steps: string[] } {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const isAndroid = /Android/.test(ua);

  if (isIOS) {
    return {
      title: "Instalar en iPhone o iPad",
      steps: [
        "Tocá el botón Compartir (el cuadrado con la flecha hacia arriba).",
        "Elegí “Agregar a inicio”.",
        "Confirmá con “Agregar”.",
      ],
    };
  }
  if (isAndroid) {
    return {
      title: "Instalar en Android",
      steps: [
        "Abrí el menú del navegador (los tres puntos).",
        "Elegí “Instalar aplicación” o “Agregar a pantalla principal”.",
        "Confirmá con “Instalar”.",
      ],
    };
  }
  return {
    title: "Instalar en tu computadora",
    steps: [
      "Buscá el ícono de instalar en la barra de direcciones.",
      "O abrí el menú del navegador y elegí “Instalar Better Work”.",
      "Confirmá con “Instalar”.",
    ],
  };
}

/**
 * Botón "Descargar aplicación" para instalar la PWA.
 *
 * Se oculta solo si la app ya está instalada. Cuando el navegador ofrece el
 * diálogo nativo lo usamos; si no lo ofrece (iOS nunca lo hace) mostramos las
 * instrucciones de esa plataforma en vez de esconder el botón, que era lo que
 * pasaba antes y lo dejaba invisible para la mayoría de la gente.
 */
export function InstallButton({ className = "" }: { className?: string }) {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  // Que la app ya esté instalada es estado del navegador, no de React.
  const standalone = useSyncExternalStore(subscribeToInstall, isStandalone, () => false);
  const [installedNow, setInstalledNow] = useState(false);
  const [help, setHelp] = useState<{ title: string; steps: string[] } | null>(null);
  const installed = standalone || installedNow;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalledNow(true);
      setPrompt(null);
      setHelp(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
      return;
    }
    // Sin diálogo nativo: explicamos cómo hacerlo a mano.
    setHelp(manualSteps());
  }

  return (
    <>
      <button onClick={install} className={`btn-secondary ${className}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden>
          <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
        Descargar aplicación
      </button>

      {help && (
        <div className="card p-4 mt-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">{help.title}</p>
            <button
              type="button"
              onClick={() => setHelp(null)}
              className="text-faint hover:text-fg transition text-sm shrink-0"
              aria-label="Cerrar instrucciones"
            >
              ✕
            </button>
          </div>
          <ol className="mt-3 space-y-2">
            {help.steps.map((s, i) => (
              <li key={s} className="flex gap-2.5 text-sm text-muted">
                <span className="w-5 h-5 rounded-full bg-fg text-bg text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
