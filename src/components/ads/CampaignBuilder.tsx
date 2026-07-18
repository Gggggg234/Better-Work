"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { OBJECTIVES, REACHES, BUDGET_PRESETS, DURATION_PRESETS, estimateCampaign, type AdRules } from "@/lib/ads";
import { formatMoney } from "@/lib/format";

function LaunchButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className="btn-primary w-full !py-3.5">
      {pending ? "Creando campaña…" : "Lanzar campaña"}
    </button>
  );
}

/**
 * Armado de campaña: presupuesto, duración, objetivo y alcance, con la
 * estimación actualizándose en vivo (misma fórmula que usa el servidor).
 */
export function CampaignBuilder({
  rules,
  action,
}: {
  rules: AdRules;
  action: (fd: FormData) => void | Promise<void>;
}) {
  const [budget, setBudget] = useState(BUDGET_PRESETS[1]);
  const [days, setDays] = useState<number>(DURATION_PRESETS[1]);
  const [objective, setObjective] = useState<string>(OBJECTIVES[0].value);
  const [reach, setReach] = useState<string>(REACHES[1].value);

  const est = useMemo(
    () => estimateCampaign(budget, days, objective, reach, rules),
    [budget, days, objective, reach, rules]
  );
  const tooLow = budget < rules.minBudget;

  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="budget" value={budget} />
      <input type="hidden" name="days" value={days} />
      <input type="hidden" name="objective" value={objective} />
      <input type="hidden" name="reach" value={reach} />

      {/* Presupuesto */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-sm">Presupuesto</h2>
          <span className="text-xs text-muted">{formatMoney(est.dailyBudget)} por día</span>
        </div>
        <input
          type="range"
          min={rules.minBudget}
          max={100000}
          step={1000}
          value={budget}
          onChange={(e) => setBudget(parseInt(e.target.value))}
          className="w-full accent-fg"
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">$</span>
            <input
              type="number"
              min={rules.minBudget}
              step={500}
              value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
              className="input pl-7 font-semibold"
            />
          </div>
          <div className="flex gap-1.5">
            {BUDGET_PRESETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBudget(b)}
                className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                  budget === b ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-fg/40"
                }`}
              >
                ${b / 1000}k
              </button>
            ))}
          </div>
        </div>
        {tooLow && (
          <p className="text-xs text-red-600">El presupuesto mínimo es {formatMoney(rules.minBudget)}.</p>
        )}
      </section>

      {/* Duración */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Duración</h2>
        <div className="grid grid-cols-3 gap-2">
          {DURATION_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                days === d ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:border-fg/40"
              }`}
            >
              {d} días
            </button>
          ))}
        </div>
      </section>

      {/* Objetivo */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Objetivo</h2>
        <div className="space-y-2">
          {OBJECTIVES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setObjective(o.value)}
              className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                objective === o.value ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-fg/40"
              }`}
            >
              <p className="text-sm font-medium">{o.icon} {o.label}</p>
              <p className={`text-xs mt-0.5 ${objective === o.value ? "text-bg/70" : "text-muted"}`}>{o.hint}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Alcance */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Alcance</h2>
        <div className="grid grid-cols-3 gap-2">
          {REACHES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReach(r.value)}
              className={`rounded-xl border px-2 py-2.5 text-center transition ${
                reach === r.value ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-fg/40"
              }`}
            >
              <span className="block text-base">{r.icon}</span>
              <span className="text-xs font-medium">{r.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-faint">{REACHES.find((r) => r.value === reach)?.hint}</p>
      </section>

      {/* Estimación en vivo */}
      <section className="card p-5 bg-fg text-bg">
        <p className="text-xs uppercase tracking-wide text-bg/60">Estimación</p>
        <p className="text-sm mt-2 leading-relaxed">
          Invirtiendo <span className="font-bold">{formatMoney(budget)}</span> durante{" "}
          <span className="font-bold">{days} días</span> podrías obtener entre{" "}
          <span className="font-bold">{est.minImpressions.toLocaleString("es-AR")}</span> y{" "}
          <span className="font-bold">{est.maxImpressions.toLocaleString("es-AR")}</span> visualizaciones.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-bg/20">
          <div>
            <p className="text-lg font-bold">
              {est.minViews.toLocaleString("es-AR")}–{est.maxViews.toLocaleString("es-AR")}
            </p>
            <p className="text-[11px] text-bg/60">Aperturas de perfil estimadas</p>
          </div>
          <div>
            <p className="text-lg font-bold">+{Math.round(est.boost * 100)}%</p>
            <p className="text-[11px] text-bg/60">Empuje en los listados</p>
          </div>
        </div>
        <p className="text-[11px] text-bg/50 mt-3">
          Es una proyección, no una garantía: los resultados dependen de tu zona, tu rubro y tu calificación.
        </p>
      </section>

      <LaunchButton disabled={tooLow} />
    </form>
  );
}
