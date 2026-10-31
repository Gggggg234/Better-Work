import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requestJob } from "@/lib/actions/jobs";
import { Avatar } from "@/components/Avatar";
import { LocationPicker } from "@/components/map/LocationPicker";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { AttachmentsInput } from "@/components/AttachmentsInput";
import { HOURS } from "@/lib/worker";
import { todayAR } from "@/lib/format";
import { getFeeConfig } from "@/lib/settings";
import { BackButton } from "@/components/BackButton";

export default async function HirePage({ params }: { params: Promise<{ workerId: string }> }) {
  const { workerId } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.id === workerId) redirect(`/w/${workerId}`);

  const [profile, fees] = await Promise.all([
    db.workerProfile.findUnique({
      where: { userId: workerId },
      include: { user: true, category: { select: { slug: true } } },
    }),
    getFeeConfig(),
  ]);
  if (!profile) notFound();

  const today = todayAR();
  const timeOptions = HOURS.slice(6, 24); // 06:00 a 23:00

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <BackButton fallback="/app" />
      <h1 className="text-2xl font-bold">Contratar</h1>

      <div className="card p-4 flex items-center gap-3 mt-4">
        <Avatar name={profile.user.name} url={profile.user.avatarUrl} size={44} />
        <div>
          <p className="font-semibold text-sm">{profile.user.name}</p>
          <p className="text-sm text-muted">{profile.profession}</p>
        </div>
      </div>
      <p className="text-xs text-muted mt-2">
        ¿Querés comparar precios?{" "}
        <Link
          href={`/pedidos/nuevo${profile.category ? `?categoria=${profile.category.slug}` : ""}`}
          className="font-medium text-fg underline"
        >
          Pedí presupuesto a varios profesionales
        </Link>
      </p>

      <form action={requestJob} className="space-y-4 mt-6">
        <input type="hidden" name="workerId" value={workerId} />

        <div>
          <label className="label">¿Qué necesitás?</label>
          <input name="title" required className="input" placeholder="Ej: Arreglar una pérdida en la cocina" />
        </div>

        {/* Urgencia: aparece primero y el recargo va íntegro al profesional. */}
        <label className="card p-4 flex items-start gap-3 cursor-pointer transition has-[:checked]:border-fg has-[:checked]:bg-surface-2">
          <input type="checkbox" name="urgent" className="mt-0.5 w-4 h-4 accent-current shrink-0" />
          <span>
            <span className="block text-sm font-semibold">🚨 Lo necesito YA</span>
            <span className="block text-xs text-muted mt-0.5">
              Tu pedido le aparece primero y destacado al profesional. Se suma un {fees.urgencyPct}% al presupuesto,
              que va íntegro al profesional por atenderte con urgencia.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha</label>
            <input name="date" type="date" required min={today} defaultValue={today} className="input" />
          </div>
          <div>
            <label className="label">Horario</label>
            <select name="time" required defaultValue="09:00" className="input">
              {timeOptions.map((h) => (
                <option key={h} value={h}>{h} hs</option>
              ))}
            </select>
          </div>
        </div>
        {profile.schedule && (
          <p className="text-xs text-faint -mt-2">
            Disponibilidad del trabajador: {profile.schedule.replace("-", " a ")} hs.
          </p>
        )}

        <div>
          <label className="label">Comentario (opcional)</label>
          <textarea
            name="description"
            className="input min-h-24"
            placeholder="Contá el problema o pedido con el mayor detalle posible…"
          />
        </div>

        <div>
          <label className="label">Fotos y documentos (opcional)</label>
          <p className="text-xs text-muted mb-2">
            Adjuntá lo que ayude al profesional a presupuestar: fotos del problema, planos, presupuestos previos.
          </p>
          <AttachmentsInput />
        </div>

        <div>
          <label className="label">Dirección</label>
          <input name="address" required className="input" placeholder="Calle, número, barrio" />
        </div>

        <div>
          <label className="label">¿Dónde se hace el trabajo?</label>
          <p className="text-xs text-muted mb-2">
            Marcá el punto exacto en el mapa. El profesional lo va a ver para saber a dónde ir.
          </p>
          <LocationPicker />
        </div>

        <div>
          <label className="label">Precio tentativo (opcional)</label>
          <input name="price" type="number" min="0" step="1" className="input" placeholder="$" />
          <p className="text-xs text-faint mt-1">
            {profile.priceHint ? `Referencia del trabajador: ${profile.priceHint}. ` : ""}
            Podés dejarlo vacío: el profesional te va a pasar un presupuesto que después aceptás o negociás.
          </p>
        </div>

        <div className="card p-3.5 bg-surface-2 !border-line">
          <p className="text-sm font-medium">Cómo sigue — Pago protegido</p>
          <p className="text-xs text-muted mt-0.5">
            Cuando el profesional acepte (o te pase un presupuesto), pagás a través de Better Work. El dinero queda
            <strong className="text-fg"> retenido</strong> y se libera al profesional recién cuando confirmás el
            código de finalización. El trabajo se inicia y termina con códigos de 4 dígitos.
          </p>
          <p className="text-xs text-muted mt-1.5">
            Al pagar se suma una tarifa de servicio del {fees.serviceFeePct}% que cubre la protección del pago. Si el
            trabajo se cancela antes de empezar, se te devuelve todo.
          </p>
        </div>

        <FormSubmitButton pendingLabel="Enviando solicitud…">Enviar solicitud</FormSubmitButton>
        <p className="text-xs text-faint text-center">
          El trabajador va a recibir tu solicitud y puede aceptarla o rechazarla.
        </p>
      </form>
    </main>
  );
}
