import { after } from "next/server";
import { db } from "./db";

/**
 * Medición de visualizaciones.
 *
 * Los contadores se escriben con `after()`: la actualización corre DESPUÉS de
 * enviar la respuesta, no antes. Así una métrica nunca agrega latencia al
 * render — el usuario ve la página y el incremento ocurre por detrás. Los
 * fallos se ignoran a propósito: una métrica nunca debe romper la navegación.
 */

/** Alguien abrió el perfil de un trabajador. */
export function trackWorkerProfileView(userId: string, viewerId: string | null) {
  if (viewerId === userId) return; // no contamos las visitas propias
  after(async () => {
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
  });
}

/** Alguien abrió el perfil/las ofertas de una empresa. */
export function trackCompanyProfileView(companyProfileId: string, userId: string, viewerId: string | null) {
  if (viewerId === userId) return;
  after(async () => {
    try {
      await db.companyProfile.update({
        where: { id: companyProfileId },
        data: { profileViews: { increment: 1 } },
      });
      await bumpActiveCampaign(userId, "COMPANY", { views: { increment: 1 }, clicks: { increment: 1 } });
    } catch {
      /* métrica best-effort */
    }
  });
}

/** Una oferta fue vista. */
export function trackOfferView(offerId: string) {
  after(async () => {
    try {
      await db.jobOffer.update({ where: { id: offerId }, data: { views: { increment: 1 } } });
    } catch {
      /* métrica best-effort */
    }
  });
}

/**
 * Perfiles que aparecieron en un listado (búsqueda, mapa, sugerencias).
 * Una sola consulta para todos los ids, corrida después de la respuesta.
 */
export function trackSearchAppearances(workerProfileIds: string[], sponsoredUserIds: string[] = []) {
  if (workerProfileIds.length === 0) return;
  after(async () => {
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
  });
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

/**
 * Cierra las campañas cuya fecha ya pasó (se llama al abrir /ads).
 *
 * Esta NO se difiere: el listado de campañas se lee justo después y tiene que
 * ver los estados ya actualizados.
 */
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
