import Link from "next/link";
import { getAdRules, estimateCampaign } from "@/lib/ads";
import { saveAdRules } from "@/lib/actions/admin";
import { formatMoney } from "@/lib/format";

export default async function AdminSettingsPage() {
  const rules = await getAdRules();

  // Ejemplo de referencia con las reglas actuales, para ver el efecto de un cambio.
  const sample = estimateCampaign(10_000, 15, "REPUTATION", "CITY", rules);

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted mt-0.5">Reglas de estimación de la publicidad.</p>
      </div>

      <form action={saveAdRules} className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Estimador de campañas</h2>
          <p className="text-xs text-muted mt-0.5">
            Con estos números calculamos el rango de resultados que se le muestra al usuario antes de lanzar una
            campaña. Siempre se presenta como estimación, nunca como garantía.
          </p>
        </div>

        <div>
          <label className="label">Apariciones estimadas por cada $1.000</label>
          <input
            name="ad_impressions_per_1000"
            type="number"
            min="1"
            max="10000"
            step="1"
            defaultValue={rules.impressionsPer1000}
            className="input"
          />
        </div>

        <div>
          <label className="label">Porcentaje que abre el perfil (%)</label>
          <input
            name="ad_view_rate"
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            defaultValue={rules.viewRatePct}
            className="input"
          />
        </div>

        <div>
          <label className="label">Presupuesto mínimo de una campaña (ARS)</label>
          <input
            name="ad_min_budget"
            type="number"
            min="0"
            max="1000000"
            step="500"
            defaultValue={rules.minBudget}
            className="input"
          />
        </div>

        <div className="card p-4 bg-surface-2 !border-line">
          <p className="text-xs uppercase tracking-wide text-faint">Con las reglas guardadas</p>
          <p className="text-sm mt-1">
            {formatMoney(10_000)} durante 15 días (ciudad) ={" "}
            <span className="font-semibold">
              {sample.minImpressions.toLocaleString("es-AR")}–{sample.maxImpressions.toLocaleString("es-AR")}
            </span>{" "}
            apariciones y{" "}
            <span className="font-semibold">
              {sample.minViews.toLocaleString("es-AR")}–{sample.maxViews.toLocaleString("es-AR")}
            </span>{" "}
            visitas al perfil.
          </p>
        </div>

        <button className="btn-primary">Guardar reglas</button>
      </form>

      <Link href="/admin/plans" className="card p-4 flex items-center justify-between hover:bg-surface-2 transition">
        <div>
          <p className="text-sm font-medium">Planes de empresa</p>
          <p className="text-xs text-muted">Precio, límites y beneficios de Starter, Business y Enterprise.</p>
        </div>
        <span className="text-faint">→</span>
      </Link>

      <div className="card p-4 text-xs text-muted space-y-1">
        <p className="font-medium text-fg">Nota técnica</p>
        <p>
          Better Work no cobra comisión por trabajo ni procesa pagos: los ingresos son las membresías de empresa
          (<code>lib/plans.ts</code>) y las campañas de publicidad (<code>lib/ads.ts</code>). Cuando se integre un
          proveedor de pagos, el cobro se enchufa en <code>lib/actions/monetize.ts</code> sin tocar el resto.
        </p>
      </div>
    </div>
  );
}
