import { CheckCircle2, Clock, XCircle, RefreshCcw, CreditCard, ShieldCheck } from "lucide-react";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { formatDate, formatMoney } from "@/lib/format";
import { SUB_STATUS_LABEL, type ReturnResult, type BillingMode } from "@/lib/billing";

/** Aviso al volver de Mercado Pago (ya verificado contra la API). */
export function ReturnBanner({ result }: { result: ReturnResult }) {
  if (!result) return null;
  const map = {
    approved: { icon: CheckCircle2, cls: "border-success/30 bg-success/8 text-success", title: "¡Pago aprobado!", body: "Ya quedó acreditado en tu cuenta." },
    subscribed: { icon: CheckCircle2, cls: "border-success/30 bg-success/8 text-success", title: "¡Suscripción activa!", body: "Mercado Pago va a cobrar solo cada mes. Podés cancelarla cuando quieras." },
    pending: { icon: Clock, cls: "border-warning/30 bg-warning/8 text-warning", title: "Pago pendiente", body: "Si pagaste en efectivo, se acredita cuando el local lo informe (puede tardar unas horas)." },
    "sub-pending": { icon: Clock, cls: "border-warning/30 bg-warning/8 text-warning", title: "Esperando la confirmación de Mercado Pago", body: "Apenas autorice el primer cobro, se activa sola. Volvé a mirar en unos minutos." },
    rejected: { icon: XCircle, cls: "border-danger/30 bg-danger/8 text-danger", title: "El pago no se completó", body: "No se cobró nada. Podés intentar de nuevo con otro medio." },
  } as const;
  const m = map[result];
  return (
    <div className={`card !border p-4 flex items-start gap-3 animate-pop-in ${m.cls}`} role="status">
      <m.icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
      <div>
        <p className="font-bold text-sm">{m.title}</p>
        <p className="text-xs mt-0.5 text-fg/70">{m.body}</p>
      </div>
    </div>
  );
}

type Sub = { id: string; status: string; amount: number; nextPaymentAt: Date | null; payerEmail: string };

/** Estado del débito automático con la opción de cancelarlo. */
export function SubscriptionStatus({
  sub,
  title,
  cancelAction,
}: {
  sub: Sub;
  title: string;
  cancelAction: () => Promise<void>;
}) {
  const active = sub.status === "AUTHORIZED";
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span className={`icon-tile w-10 h-10 ${active ? "bg-success/12 text-success" : "bg-warning/14 text-warning"}`}>
          <RefreshCcw className="w-5 h-5" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{title}</p>
          <p className="text-xs text-muted mt-0.5">{SUB_STATUS_LABEL[sub.status] ?? sub.status}</p>
          <p className="text-xs text-muted mt-1">
            {formatMoney(sub.amount)} por mes
            {active && sub.nextPaymentAt && ` · próximo cobro el ${formatDate(sub.nextPaymentAt)}`}
          </p>
          <p className="text-[11px] text-faint mt-0.5 truncate">Cuenta de Mercado Pago: {sub.payerEmail}</p>
        </div>
      </div>
      <details className="mt-3 border-t border-line pt-3">
        <summary className="list-none cursor-pointer text-xs font-bold text-danger">
          {active ? "Cancelar el débito automático" : "Descartar esta suscripción"}
        </summary>
        <form action={cancelAction} className="mt-2">
          <p className="text-xs text-muted mb-2">
            No se cobra más. Lo que ya pagaste sigue vigente hasta que venza.
          </p>
          <button className="btn-secondary w-full !py-2 !text-xs !text-danger">Sí, cancelar</button>
        </form>
      </details>
    </div>
  );
}

/**
 * Las formas de pagar con Mercado Pago: suscripción (recomendada) o un solo
 * mes. `hidden` lleva datos extra (ej. el plan elegido).
 */
export function MpPayOptions({
  mode,
  subscribeAction,
  onceAction,
  hidden,
  defaultEmail,
  price,
  subscribed = false,
}: {
  mode: BillingMode;
  subscribeAction: (fd: FormData) => Promise<void>;
  onceAction: (fd: FormData) => Promise<void>;
  hidden?: Record<string, string>;
  defaultEmail: string;
  price: number;
  /** Ya tiene un débito automático activo: sólo se ofrece pagar un mes extra. */
  subscribed?: boolean;
}) {
  if (mode === "off") return null;
  const fields = Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  return (
    <div className="space-y-2.5">
      {!subscribed && (
        <form action={subscribeAction}>
          {fields}
          <FormSubmitButton pendingLabel="Abriendo Mercado Pago…" className="!py-3.5">
            <RefreshCcw className="w-4 h-4" aria-hidden /> Suscribirme · {formatMoney(price)}/mes
          </FormSubmitButton>
          <details className="mt-1.5">
            <summary className="list-none cursor-pointer text-[11px] font-semibold text-muted text-center hover:text-fg">
              ¿Tu cuenta de Mercado Pago usa otro email? Cambialo acá
            </summary>
            <input
              name="payerEmail"
              type="email"
              defaultValue={defaultEmail}
              className="input mt-2 !py-2.5"
              aria-label="Email de tu cuenta de Mercado Pago"
            />
          </details>
        </form>
      )}
      <form action={onceAction}>
        {fields}
        <button className="btn-secondary w-full !py-3">
          <CreditCard className="w-4 h-4" aria-hidden /> {subscribed ? "Pagar un mes extra" : "Pagar sólo un mes"}
        </button>
      </form>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-faint text-center">
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
        {mode === "simulated"
          ? "Modo prueba (desarrollo): no se cobra de verdad."
          : "Pagás en Mercado Pago: tarjeta, dinero en cuenta o efectivo."}
      </p>
    </div>
  );
}
