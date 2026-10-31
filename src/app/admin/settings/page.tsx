import Link from "next/link";
import { getAdRules, estimateCampaign } from "@/lib/ads";
import { saveAdRules, saveTransferInfo, saveFeeSettings, savePaymentMode, saveProSettings } from "@/lib/actions/admin";
import { getTransferInfo, getFeeConfig, getPaymentMode } from "@/lib/settings";
import { paymentsConfigured } from "@/lib/payments";
import { getProConfig } from "@/lib/pro";
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
  const [rules, transfer, fees, mode, pro] = await Promise.all([
    getAdRules(),
    getTransferInfo(),
    getFeeConfig(),
    getPaymentMode(),
    getProConfig(),
  ]);
  const mpReady = paymentsConfigured();

  // Ejemplo con las tarifas actuales: un trabajo urgente de $10.000.
  const example = priceBreakdown(10_000, fees);

  // Ejemplo de referencia con las reglas actuales, para ver el efecto de un cambio.
  const sample = estimateCampaign(10_000, 15, "REPUTATION", "CITY", rules);

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted mt-0.5">Pagos, suscripciones y reglas de la publicidad.</p>
      </div>

      {/* Cómo se pagan los trabajos */}
      <form action={savePaymentMode} className="card p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-sm">Pago de los trabajos</h2>
          <p className="text-xs text-muted mt-0.5">Define cómo le paga el cliente al profesional.</p>
        </div>
        {[
          {
            value: "direct",
            title: "Pago directo",
            desc: "Cliente y profesional arreglan entre ellos (efectivo o transferencia). Better Work no cobra por trabajo: gana con Pro, membresías y publicidad.",
          },
          {
            value: "escrow",
            title: "Pago protegido (Mercado Pago)",
            desc: "El cliente paga por la app, el dinero queda retenido hasta el código de finalización y se cobran la comisión y la tarifa de servicio.",
          },
        ].map((o) => (
          <label
            key={o.value}
            className="flex items-start gap-3 rounded-xl border border-line p-3 cursor-pointer has-[:checked]:border-fg"
          >
            <input type="radio" name="payment_mode" value={o.value} defaultChecked={mode === o.value} className="mt-1" />
            <span>
              <span className="block text-sm font-medium">{o.title}</span>
              <span className="block text-xs text-muted mt-0.5">{o.desc}</span>
            </span>
          </label>
        ))}
        {mode === "escrow" && !mpReady && (
          <p className="text-xs text-red-600">
            ⚠ El pago protegido está elegido pero falta MP_ACCESS_TOKEN: en producción se sigue usando el pago directo
            hasta que cargues la credencial de Mercado Pago.
          </p>
        )}
        <button className="btn-primary">Guardar</button>
      </form>

      {/* Better Work Pro */}
      <form action={saveProSettings} className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Better Work Pro</h2>
          <p className="text-xs text-muted mt-0.5">
            Suscripción mensual de los profesionales. Se paga por transferencia y se aprueba desde{" "}
            <strong>Pagos</strong>. Los cambios aplican a las solicitudes nuevas.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="pro_price">Precio por mes</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input id="pro_price" name="pro_price" type="number" min="0" step="1" defaultValue={pro.price} className="input pl-7" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="pro_free_bids">Presupuestos gratis/mes</label>
            <input id="pro_free_bids" name="pro_free_bids" type="number" min="0" step="1" defaultValue={pro.freeBids} className="input" />
          </div>
        </div>
        <p className="text-xs text-faint">
          Sin Pro, un profesional puede mandar hasta esa cantidad de presupuestos nuevos por mes a pedidos abiertos.
          Con Pro son ilimitados, y además aparece más arriba en búsquedas y mapa.
        </p>
        <button className="btn-primary">Guardar Pro</button>
      </form>

      {/* Tarifas por trabajo (sólo con pago protegido) */}
      <form action={saveFeeSettings} className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Tarifas por trabajo</h2>
          <p className="text-xs text-muted mt-0.5">
            {mode === "escrow"
              ? "Se aplican a los pagos nuevos; lo ya cobrado no cambia."
              : "La comisión y la tarifa de servicio sólo se cobran con pago protegido. El recargo por urgencia aplica siempre (lo paga el cliente al profesional)."}{" "}
            El recargo por urgencia queda fijado al momento del pedido.
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
          <h2 className="font-semibold text-sm">Datos de transferencia de Better Work</h2>
          <p className="text-xs text-muted mt-0.5">
            Se muestran cuando un profesional activa Pro o una empresa elige un plan. El pago es por transferencia y
            se aprueba a mano desde <strong>Pagos</strong>.
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
          Ingresos de Better Work: Better Work Pro (<code>lib/pro.ts</code>), membresías de empresa
          (<code>lib/plans.ts</code>) y campañas de publicidad (<code>lib/ads.ts</code>), todo por transferencia con
          comprobante. Con pago protegido se suman la comisión y la tarifa de cada trabajo (<code>lib/payments/</code>),
          que sólo corre con <code>MP_ACCESS_TOKEN</code>.
        </p>
      </div>
    </div>
  );
}
