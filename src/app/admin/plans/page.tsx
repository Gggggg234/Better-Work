import { db } from "@/lib/db";
import { savePlan } from "@/lib/actions/admin";

type PlanRow = Awaited<ReturnType<typeof db.plan.findMany>>[number];

const TOGGLES: [keyof PlanRow & string, string, string][] = [
  ["analytics", "Estadísticas", "Acceso al panel de métricas"],
  ["verifiedBadge", "Perfil verificado", "Insignia de verificado automática"],
  ["featuredHome", "Destacada en el inicio", "Aparece primero en el mapa y el listado"],
  ["prioritySupport", "Soporte prioritario", "Atención preferencial"],
  ["active", "Plan visible", "Si se apaga, deja de ofrecerse a empresas nuevas"],
];

export default async function AdminPlansPage() {
  const plans = await db.plan.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Planes de empresa</h1>
        <p className="text-sm text-muted mt-0.5">
          Precio, límites y beneficios de cada membresía. Los trabajadores no pagan plan.
        </p>
      </div>

      {plans.map((p) => (
        <form key={p.key} action={savePlan} className="card p-5 space-y-4">
          <input type="hidden" name="key" value={p.key} />

          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{p.name}</h2>
            <code className="text-[11px] text-faint">{p.key}</code>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre</label>
              <input name="name" defaultValue={p.name} className="input" />
            </div>
            <div>
              <label className="label">Precio (ARS / mes)</label>
              <input name="price" type="number" min="0" step="500" defaultValue={p.price} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Frase corta</label>
            <input name="tagline" defaultValue={p.tagline} placeholder="Para empresas que recién empiezan" className="input" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Empleos activos</label>
              <input name="jobPostLimit" type="number" min="-1" max="999" step="1" defaultValue={p.jobPostLimit} className="input" />
              <p className="text-[11px] text-faint mt-1">−1 = sin límite</p>
            </div>
            <div>
              <label className="label">Postulaciones visibles</label>
              <input name="applicantLimit" type="number" min="-1" max="9999" step="1" defaultValue={p.applicantLimit} className="input" />
              <p className="text-[11px] text-faint mt-1">−1 = sin límite</p>
            </div>
            <div>
              <label className="label">Posicionamiento</label>
              <input name="searchBoost" type="number" min="0" max="1" step="0.05" defaultValue={p.searchBoost} className="input" />
              <p className="text-[11px] text-faint mt-1">0 a 1 (0.2 = +20%)</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {TOGGLES.map(([field, label, hint]) => (
              <label key={field} className="flex items-start gap-2.5 rounded-xl border border-line p-3 cursor-pointer hover:bg-surface-2 transition">
                <input
                  type="checkbox"
                  name={field}
                  defaultChecked={Boolean(p[field])}
                  className="accent-fg w-4 h-4 mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-[11px] text-faint">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          <button className="btn-primary">Guardar {p.name}</button>
        </form>
      ))}

      <div className="card p-4 text-xs text-muted">
        <p className="font-medium text-fg">Cómo sumar un beneficio nuevo</p>
        <p className="mt-1">
          Agregá la columna en el modelo <code>Plan</code>, un campo acá y el chequeo donde se aplique
          (<code>lib/plans.ts</code> arma la lista de beneficios que ve la empresa). No hace falta tocar nada más.
        </p>
      </div>
    </div>
  );
}
