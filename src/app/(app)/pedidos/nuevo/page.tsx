import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFeeConfig } from "@/lib/settings";
import { createOpenRequest } from "@/lib/actions/openRequests";
import { LocationPicker } from "@/components/map/LocationPicker";
import { AttachmentsInput } from "@/components/AttachmentsInput";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { BackButton } from "@/components/BackButton";
import { HOURS } from "@/lib/worker";
import { todayAR } from "@/lib/format";

const ERRORS: Record<string, string> = {
  categoria: "Elegí qué tipo de profesional necesitás.",
  datos: "Completá qué necesitás, el barrio y la dirección.",
};

export default async function NewOpenRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; error?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const sp = await searchParams;

  const [categories, fees] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true, slug: true, icon: true } }),
    getFeeConfig(),
  ]);
  const preselected = categories.find((c) => c.slug === sp.categoria)?.id ?? "";

  const today = todayAR();
  const timeOptions = HOURS.slice(6, 24); // 06:00 a 23:00

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <BackButton fallback="/pedidos" />
      <h1 className="text-2xl font-bold">Pedir presupuestos</h1>
      <p className="text-sm text-muted mt-1">
        Publicá tu pedido y los profesionales de tu zona te cotizan. Comparás precios, calificaciones y tiempos, y elegís
        al que más te convenga. Pedir es gratis.
      </p>

      {sp.error && ERRORS[sp.error] && (
        <div className="card p-4 mt-5 border-red-300" role="alert">
          <p className="text-sm text-red-600">⚠ {ERRORS[sp.error]}</p>
        </div>
      )}

      <form action={createOpenRequest} className="space-y-4 mt-6">
        <div>
          <label className="label" htmlFor="categoryId">¿Qué profesional necesitás?</label>
          <select id="categoryId" name="categoryId" required defaultValue={preselected} className="input">
            <option value="" disabled>Elegí un oficio</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="title">¿Qué necesitás?</label>
          <input id="title" name="title" required maxLength={120} className="input" placeholder="Ej: Arreglar una pérdida en la cocina" />
        </div>

        <label className="card p-4 flex items-start gap-3 cursor-pointer transition has-[:checked]:border-fg has-[:checked]:bg-surface-2">
          <input type="checkbox" name="urgent" className="mt-0.5 w-4 h-4 accent-current shrink-0" />
          <span>
            <span className="block text-sm font-semibold">🚨 Lo necesito YA</span>
            <span className="block text-xs text-muted mt-0.5">
              Los profesionales lo ven primero y destacado. Se suma un {fees.urgencyPct}% al presupuesto que elijas, que
              va íntegro al profesional. El pedido queda abierto 24 horas.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="date">Fecha</label>
            <input id="date" name="date" type="date" required min={today} defaultValue={today} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="time">Horario</label>
            <select id="time" name="time" required defaultValue="09:00" className="input">
              {timeOptions.map((h) => (
                <option key={h} value={h}>{h} hs</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">Detalle (opcional)</label>
          <textarea
            id="description"
            name="description"
            maxLength={2000}
            className="input min-h-24"
            placeholder="Contá el problema con el mayor detalle posible: así los presupuestos llegan más precisos."
          />
        </div>

        <div>
          <label className="label">Fotos y documentos (opcional)</label>
          <p className="text-xs text-muted mb-2">Fotos del problema, medidas, planos: ayudan a presupuestar mejor.</p>
          <AttachmentsInput />
        </div>

        <div>
          <label className="label" htmlFor="zone">Barrio o localidad</label>
          <input id="zone" name="zone" required maxLength={80} className="input" placeholder="Ej: Palermo, CABA" />
          <p className="text-xs text-faint mt-1">Es lo que ven los profesionales para saber si les queda cerca.</p>
        </div>

        <div>
          <label className="label" htmlFor="address">Dirección exacta</label>
          <input id="address" name="address" required maxLength={200} className="input" placeholder="Calle y número" />
          <p className="text-xs text-faint mt-1">🔒 Sólo la ve el profesional que elijas.</p>
        </div>

        <div>
          <label className="label">Ubicación en el mapa</label>
          <p className="text-xs text-muted mb-2">Sirve para avisarle a los profesionales que trabajan en tu zona.</p>
          <LocationPicker />
        </div>

        <FormSubmitButton pendingLabel="Publicando pedido…">Publicar pedido</FormSubmitButton>
        <p className="text-xs text-faint text-center">
          Pagás recién cuando elegís un presupuesto, y el dinero queda protegido hasta que el trabajo esté terminado.
        </p>
      </form>
    </main>
  );
}
