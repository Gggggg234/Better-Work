import { db } from "./db";

/**
 * Medición de visualizaciones. Se llama desde las páginas y listados; los
 * fallos se ignoran a propósito: una métrica nunca debe romper la navegación.
 */

/** Alguien abrió el perfil de un trabajador. */
export async function trackWorkerProfileView(userId: string, viewerId: string | null) {
  if (viewerId === userId) return; // no contamos las visitas propias
  try {
    await db.workerProfile.updateMany({
      where: { userId },
      data: { profileViews: { increment: 1 } },
    });
    // Abrir el perfil desde un listado patrocinado cuenta como clic.
    await bumpActiveCampaign(userId, "WORKER", { views: { increment: 1 }, clicks: { increment: 1 } });
  } catch {
    /* métrica best-effort */
  }
}

/** Alguien abrió el perfil/las ofertas de una empresa. */
export async function trackCompanyProfileView(companyProfileId: string, userId: string, viewerId: string | null) {
  if (viewerId === userId) return;
  try {
    await db.companyProfile.update({
      where: { id: companyProfileId },
      data: { profileViews: { increment: 1 } },
    });
    await bumpActiveCampaign(userId, "COMPANY", { views: { increment: 1 }, clicks: { increment: 1 } });
  } catch {
    /* métrica best-effort */
  }
}

/** Una oferta fue vista. */
export async function trackOfferView(offerId: string) {
  try {
    await db.jobOffer.update({ where: { id: offerId }, data: { views: { increment: 1 } } });
  } catch {
    /* métrica best-effort */
  }
}

/**
 * Perfiles que aparecieron en un listado (búsqueda, mapa, sugerencias).
 * Una sola consulta para todos los ids, así no penaliza el render.
 */
export async function trackSearchAppearances(workerProfileIds: string[], sponsoredUserIds: string[] = []) {
  if (workerProfileIds.length === 0) return;
  try {
    await db.workerProfile.updateMany({
      where: { id: { in: workerProfileIds } },
      data: { searchAppearances: { increment: 1 } },
    });
    if (sponsoredUserIds.length > 0) {
      await db.campaign.updateMany({
        where: { userId: { in: sponsoredUserIds }, status: "ACTIVE", endsAt: { gt: new Date() } },
        data: { impressions: { increment: 1 } },
      });
    }
  } catch {
    /* métrica best-effort */
  }
}

async function bumpActiveCampaign(
  userId: string,
  target: string,
  data: { views?: { increment: number }; clicks?: { increment: number } }
) {
  await db.campaign.updateMany({
    where: { userId, target, status: "ACTIVE", endsAt: { gt: new Date() } },
    data,
  });
}

/** Cierra las campañas cuya fecha ya pasó (se llama al abrir /ads). */
export async function closeExpiredCampaigns(userId: string) {
  try {
    await db.campaign.updateMany({
      where: { userId, status: "ACTIVE", endsAt: { lte: new Date() } },
      data: { status: "FINISHED" },
    });
  } catch {
    /* best-effort */
  }
}
