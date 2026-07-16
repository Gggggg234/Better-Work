/**
 * Opciones y etiquetas de las cuentas de pago (PaymentAccount).
 * Compartidas entre el formulario y las vistas.
 */

export type AccountPurpose = "PAYMENT" | "PAYOUT";

export const PAYMENT_PROVIDERS: { value: string; label: string; icon: string; detailLabel: string; detailPlaceholder: string; masked?: boolean }[] = [
  { value: "CARD_CREDIT", label: "Tarjeta de crédito", icon: "💳", detailLabel: "Últimos 4 dígitos", detailPlaceholder: "4242", masked: true },
  { value: "CARD_DEBIT", label: "Tarjeta de débito", icon: "💳", detailLabel: "Últimos 4 dígitos", detailPlaceholder: "4242", masked: true },
  { value: "MERCADO_PAGO", label: "Mercado Pago", icon: "🟦", detailLabel: "Alias o email de la cuenta", detailPlaceholder: "mi.alias.mp" },
  { value: "WALLET", label: "Billetera virtual", icon: "👛", detailLabel: "Alias o identificador", detailPlaceholder: "mi.billetera" },
];

export const PAYOUT_PROVIDERS: { value: string; label: string; icon: string; detailLabel: string; detailPlaceholder: string }[] = [
  { value: "MERCADO_PAGO", label: "Mercado Pago", icon: "🟦", detailLabel: "Alias o CVU", detailPlaceholder: "mi.alias.mp" },
  { value: "BANK", label: "Cuenta bancaria", icon: "🏦", detailLabel: "CBU o alias", detailPlaceholder: "0000000000000000000000" },
  { value: "WALLET", label: "Billetera virtual", icon: "👛", detailLabel: "Alias o CVU", detailPlaceholder: "mi.billetera" },
];

export function providerLabel(provider: string): string {
  const all = [...PAYMENT_PROVIDERS, ...PAYOUT_PROVIDERS];
  return all.find((p) => p.value === provider)?.label ?? provider;
}

export function providerIcon(provider: string): string {
  const all = [...PAYMENT_PROVIDERS, ...PAYOUT_PROVIDERS];
  return all.find((p) => p.value === provider)?.icon ?? "💳";
}

/** Texto corto para mostrar una cuenta, sin datos sensibles. */
export function accountSummary(a: { provider: string; label: string; detail: string }): string {
  if (a.provider.startsWith("CARD")) return `${a.label} terminada en ${a.detail}`;
  return a.detail ? `${a.label} · ${a.detail}` : a.label;
}
