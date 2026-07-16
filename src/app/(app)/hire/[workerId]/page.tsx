import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requestJob } from "@/lib/actions/jobs";
import { Avatar } from "@/components/Avatar";
import { GeoField } from "@/components/GeoField";
import { getCommissionPct } from "@/lib/commission";
import { HOURS } from "@/lib/worker";

export default async function HirePage({ params }: { params: Promise<{ workerId: string }> }) {
  const { workerId } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.id === workerId) redirect(`/w/${workerId}`);

  const profile = await db.workerProfile.findUnique({
    where: { userId: workerId },
    include: { user: true },
  });
  if (!profile) notFound();

  const pct = await getCommissionPct();
  const today = new Date().toISOString().slice(0, 10);
  const timeOptions = HOURS.slice(6, 24); // 06:00 a 23:00

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Contratar</h1>

      <div className="card p-4 flex items-center gap-3 mt-4">
        <Avatar name={profile.user.name} url={profile.user.avatarUrl} size={44} />
        <div>
          <p className="font-semibold text-sm">{profile.user.name}</p>
          <p className="text-sm text-muted">{profile.profession}</p>
        </div>
      </div>

      <form action={requestJob} className="space-y-4 mt-6">
        <input type="hidden" name="workerId" value={workerId} />

        <div>
          <label className="label">¿Qué necesitás?</label>
          <input name="title" required className="input" placeholder="Ej: Arreglar una pérdida en la cocina" />
        </div>

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
          <label className="label">Dirección</label>
          <input name="address" required className="input" placeholder="Calle, número, barrio" />
        </div>

        <div>
          <label className="label">Ubicación en el mapa (opcional)</label>
          <GeoField />
        </div>

        <div>
          <label className="label">Precio ofrecido</label>
          <input name="price" type="number" min="0" step="100" className="input" placeholder="$" />
          <p className="text-xs text-faint mt-1">
            {profile.priceHint ? `Referencia del trabajador: ${profile.priceHint}. ` : ""}
            Podés ajustarlo después por chat; habilita el pago protegido.
          </p>
        </div>

        <div className="card p-3.5 bg-surface-2 !border-line">
          <p className="text-sm font-medium">Pago protegido por Better Work</p>
          <p className="text-xs text-muted mt-0.5">
            Cuando el trabajador acepte, pagás a través de Better Work. El dinero queda retenido y se libera al
            finalizar el trabajo con el código de confirmación. Comisión de servicio al trabajador: {pct}%.
          </p>
        </div>

        <button className="btn-primary w-full !py-3.5">Enviar solicitud</button>
        <p className="text-xs text-faint text-center">
          El trabajador va a recibir tu solicitud y puede aceptarla o rechazarla.
        </p>
      </form>
    </main>
  );
}
