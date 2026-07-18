import { db } from "./db";
import { rankBreakdown } from "./rank";
import { workerScore } from "./ranking";

/**
 * Métricas de los dashboards. Todo se calcula desde datos reales (no hay
 * números inventados): los contadores de visualizaciones se incrementan al
 * mostrarse los perfiles y el resto se deriva de los trabajos y reseñas.
 */

export type MonthPoint = { label: string; value: number };

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Serie de los últimos N meses, con ceros donde no hubo actividad. */
export function monthlySeries(dates: Date[], months = 6): MonthPoint[] {
  const buckets = new Map<string, number>();
  const now = new Date();
  const out: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(monthKey(d), 0);
    out.push({ label: MONTH_LABELS[d.getMonth()], value: 0 });
  }
  const keys = [...buckets.keys()];
  for (const d of dates) {
    const k = monthKey(d);
    const idx = keys.indexOf(k);
    if (idx >= 0) out[idx].value++;
  }
  return out;
}

export type WorkerMetrics = {
  ratingAvg: number;
  ratingCount: number;
  jobsDone: number;
  requests: number;
  completed: number;
  cancelled: number;
  newClients: number;
  repeatClients: number;
  profileViews: number;
  searchAppearances: number;
  categoryRank: number | null;
  categoryTotal: number;
  avgResponseMins: number | null;
  rank: ReturnType<typeof rankBreakdown>;
  jobsByMonth: MonthPoint[];
  ratingByMonth: MonthPoint[];
};

export async function workerMetrics(userId: string): Promise<WorkerMetrics | null> {
  const profile = await db.workerProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  const [jobs, reviews] = await Promise.all([
    db.job.findMany({
      where: { workerId: userId },
      select: { clientId: true, status: true, requestedAt: true, completedAt: true },
      orderBy: { requestedAt: "asc" },
    }),
    db.review.findMany({
      where: { ratedId: userId },
      select: { stars: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Clientes nuevos vs recurrentes: quien contrató más de una vez es recurrente.
  const perClient = new Map<string, number>();
  for (const j of jobs) perClient.set(j.clientId, (perClient.get(j.clientId) ?? 0) + 1);
  const repeatClients = [...perClient.values()].filter((n) => n > 1).length;

  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");

  // Posición dentro de la categoría, con el mismo puntaje que usan los listados.
  let categoryRank: number | null = null;
  let categoryTotal = 0;
  if (profile.categoryId) {
    const peers = await db.workerProfile.findMany({
      where: { categoryId: profile.categoryId, visible: true, user: { suspended: false } },
      select: { id: true, ratingAvg: true, ratingCount: true, jobsDone: true, verified: true },
    });
    categoryTotal = peers.length;
    const scored = peers
      .map((p) => ({
        id: p.id,
        score: workerScore({ boost: 0, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, jobsDone: p.jobsDone, verified: p.verified, distanceKm: null }),
      }))
      .sort((a, b) => b.score - a.score);
    const idx = scored.findIndex((p) => p.id === profile.id);
    categoryRank = idx >= 0 ? idx + 1 : null;
  }

  // Evolución de la calificación: promedio acumulado por mes.
  const ratingMonths = monthlySeries(reviews.map((r) => r.createdAt));
  let running = 0;
  let count = 0;
  const byMonth = new Map<string, { sum: number; n: number }>();
  for (const r of reviews) {
    const k = monthKey(r.createdAt);
    const b = byMonth.get(k) ?? { sum: 0, n: 0 };
    b.sum += r.stars;
    b.n++;
    byMonth.set(k, b);
  }
  const now = new Date();
  // El acumulado arranca con las reseñas anteriores a la ventana: si no, un
  // perfil con historial viejo mostraría 0 en los primeros meses del gráfico.
  const windowStart = new Date(now.getFullYear(), now.getMonth() - (ratingMonths.length - 1), 1);
  for (const r of reviews) {
    if (r.createdAt < windowStart) {
      running += r.stars;
      count++;
    }
  }
  const ratingByMonth: MonthPoint[] = ratingMonths.map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (ratingMonths.length - 1 - i), 1);
    const b = byMonth.get(monthKey(d));
    if (b) {
      running += b.sum;
      count += b.n;
    }
    return { label: MONTH_LABELS[d.getMonth()], value: count ? Math.round((running / count) * 10) / 10 : 0 };
  });

  return {
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    jobsDone: profile.jobsDone,
    requests: jobs.length,
    completed: completedJobs.length,
    cancelled: jobs.filter((j) => j.status === "CANCELLED").length,
    newClients: perClient.size - repeatClients,
    repeatClients,
    profileViews: profile.profileViews,
    searchAppearances: profile.searchAppearances,
    categoryRank,
    categoryTotal,
    avgResponseMins: profile.avgResponseMins,
    rank: rankBreakdown({
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      jobsDone: profile.jobsDone,
      createdAt: profile.createdAt,
      cancellations: profile.cancellations,
      claims: profile.claims,
      avgResponseMins: profile.avgResponseMins,
      punctualityAvg: profile.punctualityAvg,
    }),
    jobsByMonth: monthlySeries(completedJobs.map((j) => j.completedAt ?? j.requestedAt)),
    ratingByMonth,
  };
}

export type CompanyMetrics = {
  offersTotal: number;
  offersActive: number;
  applications: number;
  hired: number;
  avgDaysToFill: number | null;
  offerViews: number;
  profileViews: number;
  applicationsByMonth: MonthPoint[];
};

export async function companyMetrics(companyProfileId: string): Promise<CompanyMetrics> {
  const offers = await db.jobOffer.findMany({
    where: { companyId: companyProfileId },
    select: {
      id: true,
      active: true,
      views: true,
      createdAt: true,
      applications: { select: { status: true, createdAt: true } },
    },
  });

  const allApps = offers.flatMap((o) => o.applications);
  const hired = allApps.filter((a) => a.status === "ACCEPTED").length;

  // Tiempo promedio para cubrir: de publicar la oferta a aceptar al primero.
  const fills: number[] = [];
  for (const o of offers) {
    const accepted = o.applications
      .filter((a) => a.status === "ACCEPTED")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    if (accepted) fills.push((accepted.createdAt.getTime() - o.createdAt.getTime()) / 86_400_000);
  }

  const profile = await db.companyProfile.findUnique({
    where: { id: companyProfileId },
    select: { profileViews: true },
  });

  return {
    offersTotal: offers.length,
    offersActive: offers.filter((o) => o.active).length,
    applications: allApps.length,
    hired,
    avgDaysToFill: fills.length ? Math.round((fills.reduce((a, b) => a + b, 0) / fills.length) * 10) / 10 : null,
    offerViews: offers.reduce((s, o) => s + o.views, 0),
    profileViews: profile?.profileViews ?? 0,
    applicationsByMonth: monthlySeries(allApps.map((a) => a.createdAt)),
  };
}

/** Rendimiento de una campaña: impresiones/vistas medidas + solicitudes y
 *  trabajos derivados de la ventana de la campaña. */
export async function campaignPerformance(campaign: {
  id: string;
  userId: string;
  target: string;
  startedAt: Date;
  endsAt: Date;
  impressions: number;
  views: number;
}) {
  const until = campaign.endsAt < new Date() ? campaign.endsAt : new Date();
  let requests = 0;
  let jobs = 0;

  if (campaign.target === "WORKER") {
    const inWindow = await db.job.findMany({
      where: { workerId: campaign.userId, requestedAt: { gte: campaign.startedAt, lte: until } },
      select: { status: true },
    });
    requests = inWindow.length;
    jobs = inWindow.filter((j) => j.status === "COMPLETED").length;
  } else {
    const profile = await db.companyProfile.findUnique({
      where: { userId: campaign.userId },
      select: { id: true },
    });
    if (profile) {
      const apps = await db.application.findMany({
        where: {
          offer: { companyId: profile.id },
          createdAt: { gte: campaign.startedAt, lte: until },
        },
        select: { status: true },
      });
      requests = apps.length;
      jobs = apps.filter((a) => a.status === "ACCEPTED").length;
    }
  }

  return { requests, jobs };
}
