import { db } from "./db";

/**
 * Acceso a la tabla `Setting` (clave/valor) que edita el Super Admin.
 *
 * Centraliza la lectura para no repetir el mismo `findUnique` con su fallback
 * en cada módulo. Los valores siempre se guardan como texto.
 */

export async function getSetting(key: string, fallback = ""): Promise<string> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getSettings<K extends string>(
  keys: Record<K, string>
): Promise<Record<K, string>> {
  const names = Object.keys(keys) as K[];
  const rows = await db.setting.findMany({ where: { key: { in: names } } });
  const found = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<K, string>;
  for (const k of names) out[k] = found.get(k) ?? keys[k];
  return out;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/**
 * Comisión que Manobra retiene de cada trabajo completado (escrow).
 * Editable desde el panel Super Admin. Default 5%.
 */
export async function getCommissionPct(): Promise<number> {
  const raw = parseFloat(await getSetting("commission_pct", "5"));
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 5;
}

/**
 * Cómo se pagan los trabajos:
 *  - "direct": cliente y profesional arreglan entre ellos (efectivo o
 *    transferencia). Manobra no toca ese dinero ni cobra por trabajo.
 *  - "escrow": pago protegido por Mercado Pago (retenido hasta el código de
 *    finalización, con comisión y tarifa de servicio).
 * Default "direct". Ver `escrowActive()` en lib/payments.
 */
export type PaymentMode = "direct" | "escrow";

export async function getPaymentMode(): Promise<PaymentMode> {
  return (await getSetting("payment_mode", "direct")) === "escrow" ? "escrow" : "direct";
}

/** Porcentaje válido (0 a 100) o el default. */
function pct(raw: string, fallback: number): number {
  const v = parseFloat(raw);
  return Number.isFinite(v) && v >= 0 && v <= 100 ? v : fallback;
}

export type FeeConfig = { commissionPct: number; serviceFeePct: number; urgencyPct: number };

/**
 * Tarifas de Manobra, editables desde el Super Admin:
 *  - comisión que se descuenta al profesional (default 5%),
 *  - tarifa de servicio que paga el cliente encima del trabajo (default 5%),
 *  - recargo por urgencia "Lo necesito YA", íntegro para el profesional (default 25%).
 */
export async function getFeeConfig(): Promise<FeeConfig> {
  const s = await getSettings({ commission_pct: "5", service_fee_pct: "5", urgency_pct: "25" });
  return {
    commissionPct: pct(s.commission_pct, 5),
    serviceFeePct: pct(s.service_fee_pct, 5),
    urgencyPct: pct(s.urgency_pct, 25),
  };
}

/** Datos bancarios para las transferencias de membresías. */
export type TransferInfo = { alias: string; holder: string; bank: string };

export async function getTransferInfo(): Promise<TransferInfo> {
  return getSettings({
    transfer_alias: "ArgentinaX1",
    transfer_holder: "Manobra",
    transfer_bank: "",
  }).then((s) => ({
    alias: s.transfer_alias,
    holder: s.transfer_holder,
    bank: s.transfer_bank,
  }));
}
