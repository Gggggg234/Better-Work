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
 * Comisión que Better Work retiene de cada trabajo completado (escrow).
 * Editable desde el panel Super Admin. Default 5%.
 */
export async function getCommissionPct(): Promise<number> {
  const raw = parseFloat(await getSetting("commission_pct", "5"));
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 5;
}

/** Datos bancarios para las transferencias de membresías. */
export type TransferInfo = { alias: string; holder: string; bank: string };

export async function getTransferInfo(): Promise<TransferInfo> {
  return getSettings({
    transfer_alias: "ArgentinaX1",
    transfer_holder: "Better Work",
    transfer_bank: "",
  }).then((s) => ({
    alias: s.transfer_alias,
    holder: s.transfer_holder,
    bank: s.transfer_bank,
  }));
}
