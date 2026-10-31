export function formatMoney(n: number): string {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

/**
 * Zona horaria de la app. El servidor (Vercel) corre en UTC: sin esto las
 * horas se muestran 3 h adelantadas. Argentina no tiene horario de verano.
 */
export const TZ = "America/Argentina/Buenos_Aires";

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** Fecha de hoy en Argentina como "AAAA-MM-DD" (para los <input type="date">). */
export function todayAR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Fecha + hora elegidas en un formulario, leídas como hora argentina (UTC-3). */
export function parseLocalDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function timeAgo(d: Date | string): string {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  return `hace ${days} d`;
}

export const JOB_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Solicitud enviada",
  ACCEPTED: "Aceptada",
  EN_ROUTE: "En camino",
  WORKING: "Trabajando",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
  REJECTED: "Rechazado",
};

/**
 * Tono de color de cada estado (ver clases .badge-* en globals.css). El color
 * dice de un vistazo si hay que hacer algo (ámbar), si está en marcha (azul),
 * si salió bien (verde) o si se cortó (rojo).
 */
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export const JOB_STATUS_TONE: Record<string, Tone> = {
  REQUESTED: "warning",
  ACCEPTED: "accent",
  EN_ROUTE: "accent",
  WORKING: "accent",
  COMPLETED: "success",
  CANCELLED: "danger",
  REJECTED: "danger",
};

/** Clase de badge para un tono. */
export function toneBadge(tone: Tone): string {
  return `badge badge-${tone}`;
}

export const JOB_FLOW = ["REQUESTED", "ACCEPTED", "EN_ROUTE", "WORKING", "COMPLETED"] as const;

export function genCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
