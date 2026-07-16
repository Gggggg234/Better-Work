"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Claro", icon: "☀️" },
  { value: "dark", label: "Oscuro", icon: "🌙" },
  { value: "system", label: "Auto", icon: "🖥️" },
];

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("bw-theme") as Theme) || "system";
    setTheme(saved);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    try {
      if (next === "system") localStorage.removeItem("bw-theme");
      else localStorage.setItem("bw-theme", next);
    } catch {
      /* almacenamiento no disponible */
    }
    apply(next);
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
