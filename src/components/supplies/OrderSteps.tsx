import { Check } from "lucide-react";
import { ORDER_STATUS, parseItems } from "@/lib/supplies";
import { formatMoney } from "@/lib/format";

/** Pasos del pedido; cancelado o rechazado se muestra aparte, en rojo. */
export function OrderSteps({ status, delivery }: { status: string; delivery: string }) {
  if (status === "CANCELLED" || status === "REJECTED") {
    return (
      <div className="card p-4 flex items-center gap-3 border-danger/30">
        <span className="badge badge-danger">{ORDER_STATUS[status].label}</span>
        <p className="text-sm text-muted">{ORDER_STATUS[status].hint}</p>
      </div>
    );
  }
  const middle = delivery === "DELIVERY" ? "SHIPPED" : "READY";
  const steps = [
    { key: "PENDING", label: "Enviado" },
    { key: "CONFIRMED", label: "Confirmado" },
    { key: middle, label: delivery === "DELIVERY" ? "En camino" : "Listo para retirar" },
    { key: "DELIVERED", label: "Entregado" },
  ];
  const current = Math.max(0, steps.findIndex((s) => s.key === status));
  const done = status === "DELIVERED";
  return (
    <ol className="flex items-start w-full">
      {steps.map((s, i) => {
        const reached = i <= current;
        return (
          <li key={s.key} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <span className={`absolute top-[11px] right-1/2 w-full h-0.5 ${reached ? (done ? "bg-success" : "bg-accent") : "bg-line"}`} />
            )}
            <span
              className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                reached ? (done ? "bg-fg border-fg text-bg" : "bg-accent border-accent text-accent-fg") : "bg-surface border-line"
              }`}
            >
              {reached && <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />}
            </span>
            <span className={`mt-1.5 text-[11px] text-center leading-tight ${reached ? "font-medium" : "text-faint"}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Detalle de ítems con subtotal y total confirmado. */
export function OrderItems({ items: json, subtotal, total }: { items: string; subtotal: number; total: number | null }) {
  const items = parseItems(json);
  return (
    <div className="card divide-y divide-line">
      {items.map((it) => (
        <div key={it.productId} className="p-3.5 flex items-center gap-3">
          {it.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-surface-2 shrink-0" />
          ) : (
            <span className="w-12 h-12 rounded-lg bg-surface-2 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{it.name}</p>
            <p className="text-xs text-muted">
              {it.qty} × {formatMoney(it.price)} / {it.unit}
            </p>
          </div>
          <p className="text-sm font-semibold">{formatMoney(it.price * it.qty)}</p>
        </div>
      ))}
      <div className="p-3.5 flex justify-between text-sm">
        <span className="text-muted">Subtotal</span>
        <span className="font-medium">{formatMoney(subtotal)}</span>
      </div>
      {total != null && total !== subtotal && (
        <div className="p-3.5 flex justify-between text-sm">
          <span className="text-muted">Total confirmado (con envío)</span>
          <span className="font-bold">{formatMoney(total)}</span>
        </div>
      )}
    </div>
  );
}
