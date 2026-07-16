/**
 * Opciones estructuradas del perfil de trabajador. Un único lugar para las
 * listas (experiencia, radio, modalidad, días) que usan tanto el formulario
 * de registro como las pantallas de visualización.
 */

export const EXPERIENCE_BANDS: { value: number; label: string }[] = [
  { value: 0, label: "Menos de 1 año" },
  { value: 1, label: "1 a 3 años" },
  { value: 3, label: "3 a 5 años" },
  { value: 5, label: "5 a 10 años" },
  { value: 10, label: "Más de 10 años" },
];

export function experienceLabel(years: number): string {
  // Devuelve la banda cuyo mínimo es el mayor <= years.
  let best = EXPERIENCE_BANDS[0];
  for (const b of EXPERIENCE_BANDS) if (years >= b.value) best = b;
  return best.label;
}

export const RADIUS_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 20, label: "20 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "Toda la ciudad" },
  { value: 500, label: "Toda la provincia" },
];

export function radiusLabel(km: number): string {
  const opt = RADIUS_OPTIONS.find((o) => o.value === km);
  if (opt) return opt.label;
  if (km >= 500) return "Toda la provincia";
  if (km >= 100) return "Toda la ciudad";
  return `${km} km`;
}

export const WORK_MODES: { value: string; label: string; icon: string }[] = [
  { value: "ONSITE", label: "A domicilio", icon: "🏠" },
  { value: "REMOTE", label: "Remoto", icon: "💻" },
  { value: "AMBOS", label: "Ambos", icon: "↔️" },
];

export function workModeLabel(mode: string): string {
  return WORK_MODES.find((m) => m.value === mode)?.label ?? "A domicilio";
}

export const DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"] as const;

export const PAY_METHOD_OPTIONS = ["Efectivo", "Transferencia", "Mercado Pago", "Débito", "Crédito"] as const;

/** Genera opciones de hora "HH:00" para los selectores de horario. */
export const HOURS: string[] = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
