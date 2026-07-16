export function formatMoney(n: number): string {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export const JOB_FLOW = ["REQUESTED", "ACCEPTED", "EN_ROUTE", "WORKING", "COMPLETED"] as const;

export function genCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
