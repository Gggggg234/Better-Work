import { getCommissionPct } from "@/lib/commission";
import { getPricing } from "@/lib/pricing";
import { saveCommission, savePlanAndAdPricing } from "@/lib/actions/admin";

export default async function AdminSettingsPage() {
  const [pct, pricing] = await Promise.all([getCommissionPct(), getPricing()]);

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted mt-0.5">Comisión, plan de empresa y precios de publicidad.</p>
      </div>

      {/* Comisión */}
      <form action={saveCommission} className="card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Comisión de la plataforma</h2>
        <p className="text-xs text-muted">
          Porcentaje que Better Work retiene de cada pago de trabajo (el trabajador recibe el neto al finalizar).
        </p>
        <div className="relative w-40">
          <input name="commissionPct" type="number" step="0.5" min="0" max="50" defaultValue={pct} className="input pr-8" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">%</span>
        </div>
        <button className="btn-primary">Guardar comisión</button>
      </form>

      {/* Plan empresa + publicidad */}
      <form action={savePlanAndAdPricing} className="card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Plan de empresa y publicidad</h2>
        <div>
          <label className="label">Plan Premium empresa (ARS / mes)</label>
          <input name="company_plan_price" type="number" min="0" step="500" defaultValue={pricing.company_plan_price} className="input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Destacar 7 días</label>
            <input name="promo_price_7" type="number" min="0" step="100" defaultValue={pricing.promo_price_7} className="input" />
          </div>
          <div>
            <label className="label">15 días</label>
            <input name="promo_price_15" type="number" min="0" step="100" defaultValue={pricing.promo_price_15} className="input" />
          </div>
          <div>
            <label className="label">30 días</label>
            <input name="promo_price_30" type="number" min="0" step="100" defaultValue={pricing.promo_price_30} className="input" />
          </div>
        </div>
        <button className="btn-primary">Guardar precios</button>
      </form>

      <div className="card p-4 text-xs text-muted space-y-1">
        <p className="font-medium text-fg">Nota técnica</p>
        <p>
          Precios en <code>lib/pricing.ts</code>, comisión en <code>lib/commission.ts</code> y el cobro en
          <code> lib/payments/</code> (proveedor simulado). Integrar Mercado Pago = implementar <code>PaymentProvider</code>
          y activarlo en <code>lib/payments/index.ts</code>; el resto no cambia.
        </p>
      </div>
    </div>
  );
}
