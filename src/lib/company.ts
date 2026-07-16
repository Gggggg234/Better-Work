/** Plan Premium de empresa: helpers de estado. */

export function isPlanActive(planActiveUntil: Date | null | undefined): boolean {
  return !!planActiveUntil && planActiveUntil.getTime() > Date.now();
}

export function isSponsored(sponsoredUntil: Date | null | undefined): boolean {
  return !!sponsoredUntil && sponsoredUntil.getTime() > Date.now();
}

export function daysLeft(until: Date | null | undefined): number | null {
  if (!until) return null;
  return Math.ceil((until.getTime() - Date.now()) / 86_400_000);
}
