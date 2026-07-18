import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  acceptJob,
  rejectJob,
  setEnRoute,
  enterStartCode,
  enterEndCode,
  cancelJob,
  rateJob,
} from "@/lib/actions/jobs";
import { openConversation } from "@/lib/actions/chat";
import { Avatar } from "@/components/Avatar";
import { StatusTimeline } from "@/components/StatusTimeline";
import { RatingForm } from "@/components/RatingForm";
import { Stars } from "@/components/Stars";
import { MapView } from "@/components/map/MapView";
import { formatMoney, formatDateTime } from "@/lib/format";
import { PAYMENT_LABEL, PAYMENT_HINT, needsPayment } from "@/lib/payments";
import { BackButton } from "@/components/BackButton";
import { JobPaymentForm } from "@/components/jobs/JobPaymentForm";
import { getTransferInfo } from "@/lib/settings";

function CodeCard({ code, title, hint }: { code: string; title: string; hint: string }) {
  return (
    <div className="card p-5 text-center bg-fg !border-fg text-bg">
      <p className="text-xs uppercase tracking-widest text-bg/60">{title}</p>
      <p className="text-4xl font-bold tracking-[0.35em] mt-2 font-mono">{code}</p>
      <p className="text-xs text-bg/60 mt-2">{hint}</p>
    </div>
  );
}

function CodeForm({
  action,
  label,
  error,
}: {
  action: (fd: FormData) => Promise<void>;
  label: string;
  error?: boolean;
}) {
  return (
    <form action={action} className="card p-5 space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <input
        name="code"
        required
        maxLength={4}
        inputMode="numeric"
        pattern="[0-9]*"
        className="input text-center !text-2xl tracking-[0.4em] font-mono"
        placeholder="0000"
        autoComplete="off"
      />
      {error && <p className="text-sm text-red-600">El código no coincide. Pedíselo de nuevo al cliente.</p>}
      <button className="btn-primary w-full">Confirmar código</button>
    </form>
  );
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const job = await db.job.findUnique({
    where: { id },
    include: { client: true, worker: { include: { workerProfile: true } }, reviews: true, payment: true },
  });
  if (!job) notFound();
  const isClient = job.clientId === me.id;
  const isWorker = job.workerId === me.id;
  if (!isClient && !isWorker && me.role !== "ADMIN") notFound();

  const other = isClient ? job.worker : job.client;
  const myReview = job.reviews.find((r) => r.raterId === me.id);
  const theirReview = job.reviews.find((r) => r.ratedId === me.id);
  const codeError = sp.error === "codigo";

  // Escrow: el trabajo no arranca hasta que el dinero está retenido.
  const pendingPayment = needsPayment(job.price, job.payment?.status);
  const transfer = pendingPayment && isClient ? await getTransferInfo() : null;

  const scheduledLabel = (() => {
    if (!job.scheduledFor) return null;
    const raw = new Date(job.scheduledFor).toLocaleString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  const accept = acceptJob.bind(null, job.id);
  const reject = rejectJob.bind(null, job.id);
  const enRoute = setEnRoute.bind(null, job.id);
  const startCode = enterStartCode.bind(null, job.id);
  const endCode = enterEndCode.bind(null, job.id);
  const cancel = cancelJob.bind(null, job.id);
  const rate = rateJob.bind(null, job.id);
  const chat = openConversation.bind(null, other.id);

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 space-y-5 animate-fade-up">
      <BackButton fallback="/jobs" />
      <div>
        <h1 className="text-xl font-bold">{job.title}</h1>
        <p className="text-sm text-muted">Solicitado el {formatDateTime(job.requestedAt)}</p>
      </div>

      <StatusTimeline status={job.status} />

      {/* Contraparte */}
      <div className="card p-4 flex items-center gap-3">
        <Avatar name={other.name} url={other.avatarUrl} size={44} />
        <div className="flex-1">
          <p className="font-semibold text-sm">{other.name}</p>
          <p className="text-xs text-muted">{isClient ? "Trabajador" : "Cliente"}</p>
        </div>
        <form action={chat}>
          <button className="btn-secondary !py-2 !px-3 !text-xs">Mensaje</button>
        </form>
      </div>

      {/* Agenda propuesta: clave para que el trabajador decida */}
      {scheduledLabel && (
        <div className="card p-4 flex items-center gap-3">
          <span className="text-2xl w-10 text-center shrink-0">🗓</span>
          <div>
            <p className="text-xs uppercase tracking-wide text-faint">Fecha y hora acordadas</p>
            <p className="font-semibold text-sm">{scheduledLabel} hs</p>
          </div>
        </div>
      )}

      {/* Detalles */}
      <div className="card divide-y divide-line">
        {job.description && <div className="p-4 text-sm text-muted">{job.description}</div>}
        {job.address && (
          <div className="p-4 flex justify-between text-sm">
            <span className="text-muted">Dirección</span>
            <span className="font-medium text-right">{job.address}</span>
          </div>
        )}
        {job.price != null && (
          <div className="p-4 flex justify-between text-sm">
            <span className="text-muted">Presupuesto</span>
            <span className="font-medium">{formatMoney(job.price)}</span>
          </div>
        )}
        <div className="p-4 flex justify-between text-sm">
          <span className="text-muted">Pago</span>
          <span className="font-medium text-right">
            {job.payment ? PAYMENT_LABEL[job.payment.status] : "A través de Better Work"}
          </span>
        </div>
      </div>

      {/* Estado del pago retenido */}
      {job.payment && (
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-faint">Pago del trabajo</p>
              <p className="text-2xl font-bold mt-0.5">{formatMoney(job.payment.amount)}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${
                job.payment.status === "RELEASED"
                  ? "bg-fg text-bg"
                  : job.payment.status === "HELD"
                    ? "border border-fg text-fg"
                    : "bg-surface-2 text-muted"
              }`}
            >
              {PAYMENT_LABEL[job.payment.status]}
            </span>
          </div>
          <p className="text-xs text-muted mt-2">{PAYMENT_HINT[job.payment.status]}</p>
        </div>
      )}

      {/* El cliente paga antes de que empiece el trabajo */}
      {isClient && pendingPayment && ["ACCEPTED", "EN_ROUTE"].includes(job.status) && transfer && (
        <JobPaymentForm
          jobId={job.id}
          amount={job.price ?? 0}
          alias={transfer.alias}
          holder={transfer.holder}
          workerName={other.name}
          error={sp.error}
        />
      )}
      {isWorker && pendingPayment && ["ACCEPTED", "EN_ROUTE"].includes(job.status) && (
        <div className="card p-4">
          <p className="text-sm font-medium">Esperando el pago del cliente</p>
          <p className="text-xs text-muted mt-0.5">
            Vas a poder iniciar el trabajo cuando el dinero esté retenido por Better Work. Así cobrás seguro al
            terminar.
          </p>
        </div>
      )}

      {job.lat != null && job.lng != null && (
        <div className="h-44 rounded-2xl overflow-hidden border border-line">
          <MapView
            center={[job.lat, job.lng]}
            zoom={15}
            markers={[{ id: job.id, lat: job.lat, lng: job.lng, label: job.title, kind: "job" }]}
          />
        </div>
      )}

      {/* ===== Acciones según estado y rol ===== */}

      {job.status === "REQUESTED" && isWorker && (
        <div className="flex gap-2">
          <form action={accept} className="flex-1 flex"><button className="btn-primary flex-1 !py-3">Aceptar</button></form>
          <form action={reject} className="flex-1 flex"><button className="btn-secondary flex-1 !py-3">Rechazar</button></form>
        </div>
      )}
      {job.status === "REQUESTED" && isClient && (
        <p className="text-sm text-muted text-center">Esperando que {other.name} acepte tu solicitud…</p>
      )}

      {job.status === "ACCEPTED" && isWorker && (
        <>
          <form action={enRoute}><button className="btn-primary w-full !py-3">🚗 Estoy en camino</button></form>
          {!pendingPayment && (
            <CodeForm action={startCode} label="Cuando llegues, pedile al cliente el código de inicio:" error={codeError} />
          )}
        </>
      )}
      {job.status === "EN_ROUTE" && isWorker && !pendingPayment && (
        <CodeForm action={startCode} label="Pedile al cliente el código de inicio para confirmar que llegaste:" error={codeError} />
      )}
      {["ACCEPTED", "EN_ROUTE"].includes(job.status) && isClient && !pendingPayment && job.startCode && (
        <CodeCard
          code={job.startCode}
          title="Código de inicio"
          hint={`Compartilo con ${other.name} recién cuando llegue. Confirma que el trabajo comenzó.`}
        />
      )}

      {job.status === "WORKING" && isClient && job.endCode && (
        <CodeCard
          code={job.endCode}
          title="Código de finalización"
          hint="Compartilo solo cuando el trabajo esté terminado. Libera el pago y habilita las calificaciones."
        />
      )}
      {job.status === "WORKING" && isWorker && (
        <CodeForm action={endCode} label="Al terminar, pedile al cliente el código de finalización:" error={codeError} />
      )}

      {["REQUESTED", "ACCEPTED", "EN_ROUTE"].includes(job.status) && (
        <form action={cancel}>
          <button className="btn-ghost w-full text-red-600 hover:!bg-red-50">Cancelar trabajo</button>
        </form>
      )}

      {/* Finalizado: calificaciones */}
      {job.status === "COMPLETED" && (
        <>
          {!myReview && <RatingForm action={rate} targetName={other.name} />}
          {myReview && (
            <div className="card p-4">
              <p className="text-sm font-medium">Tu calificación</p>
              <Stars value={myReview.stars} />
              {myReview.comment && <p className="text-sm text-muted mt-1">{myReview.comment}</p>}
            </div>
          )}
          {theirReview && (
            <div className="card p-4">
              <p className="text-sm font-medium">{other.name} te calificó</p>
              <Stars value={theirReview.stars} />
              {theirReview.comment && <p className="text-sm text-muted mt-1">{theirReview.comment}</p>}
            </div>
          )}
        </>
      )}
    </main>
  );
}
