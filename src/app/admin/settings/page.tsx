import Link from "next/link";
import { getAdRules, estimateCampaign } from "@/lib/ads";
import { saveAdRules, saveTransferInfo, saveFeeSettings } from "@/lib/actions/admin";
import { getTransferInfo, getFeeConfig } from "@/lib/settings";
import { priceBreakdown } from "@/lib/payments/escrow";
import { formatMoney } from "@/lib/format";

function PctInput({ name, value }: { name: string; value: number }) {
  return (
    <div className="relative w-28 shrink-0">
      <input name={name} type="number" min="0" max="100" step="0.5" defaultValue={value} className="input pr-8" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">%</span>
    </div>
  );
}

export default async function AdminSettingsPage() {
  const [rules, transfer, fees] = await Promise.all([getAdRules(), getTransferInfo(), getFeeConfig()]);

  // Ejemplo con las tarifas actuales: un trabajo urgente de $10.000.
  const example = priceBreakdown(10_000, fees);

  // Ejemplo de referencia con las reglas actuales, para ver el efecto de un cambio.
  const sample = estimateCampaign(10_000, 15, "REPUTATION", "CITY", rules);

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted mt-0.5">Datos de cobro y reglas de la publicidad.</p>
      </div>

      {/* Tarifas de Better Work (escrow) */}
      <form action={saveFeeSettings} className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Tarifas por trabajo</h2>
          <p className="text-xs text-muted mt-0.5">
            Se aplican a los pagos nuevos; lo ya cobrado no cambia. El recargo por urgencia queda fijado al momento del
            pedido.
          </p>
        </div>

        {[
          { name: "commission_pct", value: fees.commissionPct, label: "Comisión al profesional", hint: "Se descuenta al liberar el pago." },
          { name: "service_fee_pct", value: fees.serviceFeePct, label: "Tarifa de servicio al cliente", hint: "Se suma a lo que paga el cliente." },
          { name: "urgency_pct", value: fees.urgencyPct, label: "Recargo por urgencia", hint: "“Lo necesito YA”: va íntegro al profesional." },
        ].map((f) => (
          <div key={f.name} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{f.label}</p>
              <p className="text-xs text-faint">{f.hint}</p>
            </div>
            <PctInput name={f.name} value={f.value} />
          </div>
        ))}

        <div className="rounded-xl bg-surface-2 p-3 text-xs text-muted space-y-0.5">
          <p className="font-medium text-fg">Ejemplo: trabajo urgente de {formatMoney(10_000)}</p>
          <p>
            El cliente paga {formatMoney(example.clientTotal)} · el profesional cobra {formatMoney(example.net)} · Better
            Work gana {formatMoney(example.serviceFee + example.commission)}.
          </p>
        </div>

        <button className="btn-primary">Guardar tarifas</button>
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
          Ingresos de Better Work: membresías de empresa (<code>lib/plans.ts</code>), campañas de publicidad
          (<code>lib/ads.ts</code>) y la comisión de cada trabajo, retenida por el escrow y liberada con el pago
          (<code>lib/payments/</code>). El proveedor de pago es Mercado Pago si está <code>MP_ACCESS_TOKEN</code>; si
          no, uno simulado para probar el flujo.
        </p>
      </div>
    </div>
  );
}
