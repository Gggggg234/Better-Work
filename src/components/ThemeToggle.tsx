"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Claro", icon: "☀️" },
  { value: "dark", label: "Oscuro", icon: "🌙" },
  { value: "system", label: "Auto", icon: "🖥️" },
];

const STORAGE_KEY = "bw-theme";
// Evento propio: localStorage no avisa los cambios de la misma pestaña.
const THEME_EVENT = "bw-theme-change";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/**
 * La preferencia vive en localStorage (fuera de React), así que la leemos con
 * useSyncExternalStore en vez de copiarla a estado en un efecto.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
  } catch {
    return "system";
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "system" as Theme);

  function choose(next: Theme) {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* almacenamiento no disponible */
    }
    apply(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={theme === o.value}
          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition text-center ${
            theme === o.value ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:border-fg/40"
          }`}
        >
          <span className="block text-base">{o.icon}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}
