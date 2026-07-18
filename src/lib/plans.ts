import { db } from "./db";

/**
 * Membresías de empresa. Los trabajadores usan Better Work gratis; las
 * empresas necesitan un plan activo para publicar y aparecer.
 *
 * Los planes viven en la tabla `Plan` y se editan desde el panel Super Admin,
 * así que sumar un beneficio nuevo es agregar una columna y su chequeo acá.
 */
export const PLAN_KEYS = ["STARTER", "BUSINESS", "ENTERPRISE"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export type PlanBenefits = {
  key: string;
  name: string;
  tagline: string;
  price: number;
  jobPostLimit: number; // -1 = ilimitado
  applicantLimit: number; // -1 = ilimitado
  searchBoost: number;
  analytics: boolean;
  verifiedBadge: boolean;
  featuredHome: boolean;
  prioritySupport: boolean;
};

/** Plan por defecto cuando la empresa no tiene membresía activa. */
export const FREE_PLAN: PlanBenefits = {
  key: "NONE",
  name: "Sin plan",
  tagline: "",
  price: 0,
  jobPostLimit: 0,
  applicantLimit: 0,
  searchBoost: 0,
  analytics: false,
  verifiedBadge: false,
  featuredHome: false,
  prioritySupport: false,
};

export async function listPlans(): Promise<PlanBenefits[]> {
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } });
  return plans;
}

export function isPlanActive(planActiveUntil: Date | null | undefined): boolean {
  return !!planActiveUntil && planActiveUntil.getTime() > Date.now();
}

/** Beneficios vigentes de una empresa (FREE_PLAN si venció o no tiene). */
export async function benefitsFor(company: {
  planKey: string | null;
  planActiveUntil: Date | null;
}): Promise<PlanBenefits> {
  if (!isPlanActive(company.planActiveUntil) || !company.planKey) return FREE_PLAN;
  const plan = await db.plan.findUnique({ where: { key: company.planKey } });
  return plan ?? FREE_PLAN;
}

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

export function limitLabel(limit: number, singular: string, plural: string): string {
  if (isUnlimited(limit)) return `${plural} ilimitadas`;
  return `${limit} ${limit === 1 ? singular : plural}`;
}

/** Lista legible de beneficios, para las tarjetas de plan. */
export function benefitList(p: PlanBenefits): string[] {
  const out = [
    isUnlimited(p.jobPostLimit)
      ? "Publicá empleos sin límite"
      : `Hasta ${p.jobPostLimit} ${p.jobPostLimit === 1 ? "empleo activo" : "empleos activos"}`,
    isUnlimited(p.applicantLimit)
      ? "Ves todas las postulaciones"
      : `Ves hasta ${p.applicantLimit} postulaciones por empleo`,
  ];
  if (p.searchBoost > 0) out.push(`Mejor posicionamiento (+${Math.round(p.searchBoost * 100)}%)`);
  if (p.analytics) out.push("Estadísticas y métricas de rendimiento");
  if (p.verifiedBadge) out.push("Perfil verificado");
  if (p.featuredHome) out.push("Empresa destacada en el inicio");
  if (p.prioritySupport) out.push("Soporte prioritario");
  return out;
}
