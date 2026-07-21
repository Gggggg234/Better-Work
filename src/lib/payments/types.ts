/**
 * Contrato del sistema de pagos (desacoplado del proveedor).
 *
 * Better Work actúa como intermediario: el cliente paga, el dinero queda
 * RETENIDO y sólo se libera al trabajador cuando se confirma el código de
 * finalización. Ese ciclo de vida es independiente del proveedor.
 *
 * Mercado Pago es el primer proveedor, pero no el único: para sumar tarjetas,
 * otra billetera, transferencias o un gateway nuevo, se implementa la interfaz
 * `PaymentProvider` y se registra en `index.ts`. Ninguna otra parte del sistema
 * necesita cambiar.
 */

/** Estados del dinero retenido (escrow). */
export type EscrowStatus =
  | "PENDING" //  el cobro se inició, esperando confirmación del proveedor
  | "HELD" //     el dinero está retenido por Better Work
  | "RELEASED" // liberado al trabajador (tras el código de finalización)
  | "REFUNDED"; //devuelto al cliente (cancelación)

/** Lo que se está cobrando. */
export type PaymentSubject = {
  jobId: string;
  amount: number; // ARS
  title: string; // descripción que ve el cliente en el checkout
  payerEmail?: string;
};

/**
 * Resultado de iniciar un cobro.
 *  - `redirect`: hay que mandar al cliente a la URL del checkout del proveedor
 *    (Mercado Pago Checkout Pro). El dinero pasa a HELD cuando el webhook
 *    confirma la aprobación.
 *  - `held`: el proveedor retuvo el dinero al instante (proveedor simulado, o
 *    un futuro gateway con cobro sincrónico). No hace falta redirigir.
 */
export type CheckoutResult =
  | { kind: "redirect"; url: string; providerRef: string }
  | { kind: "held"; providerRef: string };

/** Estado real de un pago consultado en el proveedor (lo usa el webhook). */
export type ProviderPaymentStatus = "pending" | "approved" | "rejected" | "refunded" | "unknown";

/**
 * Un proveedor de pagos. Implementar esta interfaz es todo lo que hace falta
 * para agregar un gateway nuevo.
 */
export interface PaymentProvider {
  /** Identificador estable, ej. "mercadopago". */
  readonly id: string;
  /** Nombre para mostrar, ej. "Mercado Pago". */
  readonly label: string;

  /** Inicia el cobro del trabajo. */
  createCheckout(subject: PaymentSubject): Promise<CheckoutResult>;

  /**
   * Consulta el estado real de un pago en el proveedor. Lo llama el webhook,
   * que nunca confía en el cuerpo de la notificación: siempre re-consulta.
   */
  getStatus(providerRef: string): Promise<ProviderPaymentStatus>;

  /** Devuelve el dinero retenido al cliente. */
  refund(providerRef: string): Promise<void>;
}
