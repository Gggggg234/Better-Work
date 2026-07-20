"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { detectInstall, type InstallInfo } from "@/lib/install";

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

const PLATFORM_ICON: Record<string, string> = {
  ios: "📱",
  android: "🤖",
  desktop: "💻",
};

/**
 * Botón "Descargar aplicación" para instalar la PWA.
 *
 * Se oculta solo si ya está instalada. Si el navegador ofrece el diálogo nativo
 * (Chrome/Edge en Android y escritorio) lo usamos directo; si no lo ofrece
 * (iOS siempre, Firefox, navegadores in-app) abrimos un instructivo adaptado a
 * ese sistema — iOS, Android o computadora — en vez de esconder el botón.
 */
export function InstallButton({ className = "" }: { className?: string }) {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  // Que la app ya esté instalada es estado del navegador, no de React.
  const standalone = useSyncExternalStore(subscribeToInstall, isStandalone, () => false);
  const [installedNow, setInstalledNow] = useState(false);
  const [help, setHelp] = useState<InstallInfo | null>(null);
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

  // Cierra el instructivo con la tecla Escape.
  useEffect(() => {
    if (!help) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHelp(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [help]);

  if (installed) return null;

  async function install() {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
      return;
    }
    // Sin diálogo nativo: mostramos el instructivo de esta plataforma.
    setHelp(detectInstall());
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
        <div
          className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 p-4 animate-fade-up"
          role="dialog"
          aria-modal="true"
          aria-label={help.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setHelp(null);
          }}
        >
          <div className="bg-surface w-full max-w-sm rounded-2xl p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {PLATFORM_ICON[help.platform] && (
                  <span className="text-xl shrink-0" aria-hidden>{PLATFORM_ICON[help.platform]}</span>
                )}
                <p className="font-semibold">{help.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setHelp(null)}
                className="text-faint hover:text-fg transition text-lg leading-none shrink-0 -mt-0.5"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {help.inApp && (
              <p className="text-xs text-red-600 mt-2">{help.note}</p>
            )}

            <ol className="mt-4 space-y-3">
              {help.steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-muted">
                  <span className="w-6 h-6 rounded-full bg-fg text-bg text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>

            {help.note && !help.inApp && (
              <p className="text-xs text-faint mt-4">{help.note}</p>
            )}

            <button onClick={() => setHelp(null)} className="btn-primary w-full mt-5 !py-2.5 !text-sm">
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
