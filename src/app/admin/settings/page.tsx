import Link from "next/link";
import { getAdRules, estimateCampaign } from "@/lib/ads";
import { saveAdRules, saveTransferInfo, saveCommissionPct } from "@/lib/actions/admin";
import { getTransferInfo, getCommissionPct } from "@/lib/settings";
import { formatMoney } from "@/lib/format";

export default async function AdminSettingsPage() {
  const [rules, transfer, commissionPct] = await Promise.all([
    getAdRules(),
    getTransferInfo(),
    getCommissionPct(),
  ]);

  // Ejemplo de referencia con las reglas actuales, para ver el efecto de un cambio.
  const sample = estimateCampaign(10_000, 15, "REPUTATION", "CITY", rules);

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted mt-0.5">Datos de cobro y reglas de la publicidad.</p>
      </div>

      {/* Comisión de Better Work (escrow) */}
      <form action={saveCommissionPct} className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Comisión por trabajo</h2>
          <p className="text-xs text-muted mt-0.5">
            Porcentaje que Better Work retiene de cada trabajo completado. Se descuenta al liberar el pago retenido
            (escrow); el resto va al profesional.
          </p>
        </div>
        <div className="relative w-40">
          <input
            name="commission_pct"
            type="number"
            min="0"
            max="100"
            step="0.5"
            defaultValue={commissionPct}
            className="input pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">%</span>
        </div>
        <button className="btn-primary">Guardar comisión</button>
      </form>

      {/* Datos de transferencia para las membresías */}
      <form action={saveTransferInfo} className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Cobro de membresías</h2>
          <p className="text-xs text-muted mt-0.5">
            Estos datos se le muestran a la empresa cuando elige un plan. El pago es por transferencia y se aprueba a
            mano desde <strong>Pagos</strong>.
          </p>
        </div>

        <div>
          <label className="label">Alias para transferencias</label>
          <input name="transfer_alias" required defaultValue={transfer.alias} className="input" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Titular de la cuenta</label>
            <input name="transfer_holder" defaultValue={transfer.holder} placeholder="Better Work" className="input" />
          </div>
          <div>
            <label className="label">Banco (opcional)</label>
            <input name="transfer_bank" defaultValue={transfer.bank} placeholder="Ej: Banco Nación" className="input" />
          </div>
        </div>

        <button className="btn-primary">Guardar datos de cobro</button>
      </form>

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
