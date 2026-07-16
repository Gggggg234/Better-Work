"use client";

import { useState } from "react";

function StarPicker({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState(0);
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex gap-0.5">
        <input type="hidden" name={name} value={value} />
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className={`text-xl leading-none transition ${n <= value ? "text-fg" : "text-faint hover:text-faint"}`}
            aria-label={`${n} estrellas`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function RatingForm({ action, targetName }: { action: (fd: FormData) => Promise<void>; targetName: string }) {
  return (
    <form action={action} className="card p-5 space-y-3 animate-fade-up">
      <h3 className="font-semibold">Calificá a {targetName}</h3>
      <StarPicker name="stars" label="General" />
      <div className="border-t border-line pt-2">
        <StarPicker name="punctuality" label="Puntualidad" />
        <StarPicker name="quality" label="Calidad" />
        <StarPicker name="communication" label="Comunicación" />
        <StarPicker name="compliance" label="Cumplimiento" />
      </div>
      <textarea name="comment" placeholder="Contanos cómo fue tu experiencia (opcional)" className="input min-h-20" />
      <button className="btn-primary w-full">Enviar calificación</button>
    </form>
  );
}
