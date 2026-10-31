import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { saveSupplierProfile } from "@/lib/actions/supplies";
import { PRODUCT_CATEGORIES, SUPPLY_PAY_METHODS, parseList } from "@/lib/supplies";
import { BackButton } from "@/components/BackButton";
import { LocationPicker } from "@/components/map/LocationPicker";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { SupplierLogo } from "@/components/supplies/Cards";

const ERRORS: Record<string, string> = {
  nombre: "Poné el nombre del comercio.",
  logo: "No pudimos leer esa imagen. Subí un JPG, PNG o WEBP de hasta 8 MB.",
};

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function SupplierProfileForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const sp = await searchParams;
  const p = me.supplierProfile ?? (await db.supplierProfile.create({ data: { userId: me.id, businessName: me.name } }));
  const rubros = parseList(p.rubros);
  const payMethods = parseList(p.payMethods);

  return (
    <main className="max-w-2xl mx-auto w-full px-4 py-5 space-y-5 animate-fade-up">
      <div>
        <BackButton fallback="/proveedor" />
        <h1 className="text-2xl font-bold tracking-tight">Mi comercio</h1>
        <p className="text-sm text-muted mt-0.5">Esto es lo que ven los compradores en tu tienda.</p>
      </div>

      {sp.error && ERRORS[sp.error] && (
        <div className="card p-4 !border-danger/40" role="alert">
          <p className="text-sm text-danger">{ERRORS[sp.error]}</p>
        </div>
      )}

      <form action={saveSupplierProfile} className="space-y-5">
        <Block title="Datos del comercio">
          <div className="flex items-center gap-4">
            <SupplierLogo name={p.businessName} url={p.logoUrl} size={64} />
            <label className="flex-1">
              <span className="label">Logo o foto del local</span>
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-fg file:px-3 file:py-2 file:text-xs file:font-medium file:text-bg"
              />
            </label>
          </div>
          <div>
            <label className="label" htmlFor="businessName">Nombre del comercio</label>
            <input id="businessName" name="businessName" required maxLength={80} defaultValue={p.businessName} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              maxLength={600}
              defaultValue={p.description}
              className="input min-h-20"
              placeholder="Qué vendés, marcas que trabajás, años en el barrio…"
            />
          </div>
        </Block>

        <Block title="Contacto y ubicación" hint="Para que te encuentren y sepan si les queda cerca.">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="phone">Teléfono</label>
              <input id="phone" name="phone" inputMode="tel" maxLength={40} defaultValue={p.phone} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="whatsapp">WhatsApp</label>
              <input id="whatsapp" name="whatsapp" inputMode="tel" maxLength={40} defaultValue={p.whatsapp} className="input" placeholder="Ej: 11 5555 5555" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="address">Dirección del local</label>
            <input id="address" name="address" maxLength={160} defaultValue={p.address} className="input" placeholder="Calle y número" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="zone">Barrio</label>
              <input id="zone" name="zone" maxLength={80} defaultValue={p.zone} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="city">Ciudad</label>
              <input id="city" name="city" maxLength={80} defaultValue={p.city} className="input" />
            </div>
          </div>
          <div>
            <span className="label">Ubicación en el mapa</span>
            <LocationPicker lat={p.lat} lng={p.lng} />
          </div>
          <div>
            <label className="label" htmlFor="hours">Horario de atención</label>
            <input id="hours" name="hours" maxLength={160} defaultValue={p.hours} className="input" placeholder="Lun a Vie 8 a 18 · Sáb 8 a 13" />
          </div>
        </Block>

        <Block title="¿Qué vendés?" hint="Elegí tus rubros: así te encuentran en los filtros.">
          <div className="flex flex-wrap gap-2">
            {PRODUCT_CATEGORIES.map((c) => (
              <label key={c.slug} className="chip !py-1.5 has-[:checked]:border-fg has-[:checked]:bg-fg has-[:checked]:text-bg">
                <input type="checkbox" name="rubros" value={c.slug} defaultChecked={rubros.includes(c.slug)} className="sr-only" />
                <c.icon className="w-4 h-4" aria-hidden /> {c.name}
              </label>
            ))}
          </div>
        </Block>

        <Block title="Entrega" hint="Cómo le llegan los productos al comprador.">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="pickup" defaultChecked={p.pickup} className="mt-0.5 w-4 h-4 accent-current" />
            <span>
              <span className="font-medium">Retiro en el local</span>
              <span className="block text-xs text-muted">El comprador pasa a buscar el pedido.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="delivery" defaultChecked={p.delivery} className="mt-0.5 w-4 h-4 accent-current" />
            <span>
              <span className="font-medium">Hago envíos</span>
              <span className="block text-xs text-muted">Llevás el pedido a la dirección del comprador.</span>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="deliveryRadiusKm">Radio de envío (km)</label>
              <input id="deliveryRadiusKm" name="deliveryRadiusKm" type="number" min="1" max="500" step="1" defaultValue={p.deliveryRadiusKm} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="deliveryFee">Costo de envío</label>
              <input id="deliveryFee" name="deliveryFee" maxLength={120} defaultValue={p.deliveryFee} className="input" placeholder="Gratis desde $50.000" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="minOrder">Pedido mínimo (opcional)</label>
            <input id="minOrder" name="minOrder" type="number" min="0" step="1" defaultValue={p.minOrder ?? ""} className="input" placeholder="$" />
          </div>
        </Block>

        <Block title="Cobro" hint="El comprador te paga directo, al retirar o al recibir. Better Work no cobra comisión por venta.">
          <div className="flex flex-wrap gap-2">
            {SUPPLY_PAY_METHODS.map((m) => (
              <label key={m} className="chip !py-1.5 has-[:checked]:border-fg has-[:checked]:bg-fg has-[:checked]:text-bg">
                <input type="checkbox" name="payMethods" value={m} defaultChecked={payMethods.includes(m)} className="sr-only" />
                {m}
              </label>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="payAlias">Alias o CBU para transferencias (opcional)</label>
            <input id="payAlias" name="payAlias" maxLength={80} defaultValue={p.payAlias} className="input" placeholder="mi.corralon.mp" />
            <p className="text-xs text-faint mt-1">Lo ve el comprador que elige pagar por transferencia.</p>
          </div>
        </Block>

        <Block title="Visibilidad">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="visible" defaultChecked={p.visible} className="mt-0.5 w-4 h-4 accent-current" />
            <span>
              <span className="font-medium">Tienda visible</span>
              <span className="block text-xs text-muted">Si la desmarcás, nadie ve tus productos (por ejemplo, en vacaciones).</span>
            </span>
          </label>
        </Block>

        <FormSubmitButton pendingLabel="Guardando…">Guardar comercio</FormSubmitButton>
      </form>
    </main>
  );
}
