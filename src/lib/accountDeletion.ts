import { db } from "@/lib/db";
import { deleteUpload } from "@/lib/upload";

/**
 * Borrado de cuentas.
 *
 * Sólo se permite el borrado real cuando la cuenta no tiene actividad:
 * trabajos, pagos (van atados al trabajo), reseñas, mensajes, denuncias,
 * postulaciones, membresías pagadas o campañas de publicidad. Con actividad,
 * borrar el usuario rompería referencias o volaría historial de facturación,
 * así que se rechaza y se deriva a soporte para una baja manual.
 */
export async function deleteAccountIfEmpty(userId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { workerProfile: true, companyProfile: true },
  });
  if (!user) return { ok: false, reason: "No encontramos la cuenta." };
  if (user.role === "ADMIN") return { ok: false, reason: "Las cuentas de administrador no se pueden eliminar." };

  const [jobs, reviews, messages, conversations, reports, applications, planRequests, topUps, campaigns, supplyOrders, mpBilling] =
    await Promise.all([
      db.job.count({ where: { OR: [{ clientId: userId }, { workerId: userId }] } }),
      db.review.count({ where: { OR: [{ raterId: userId }, { ratedId: userId }] } }),
      db.message.count({ where: { senderId: userId } }),
      db.conversation.count({ where: { OR: [{ aId: userId }, { bId: userId }] } }),
      db.report.count({ where: { OR: [{ reporterId: userId }, { targetId: userId }] } }),
      db.application.count({ where: { workerId: userId } }),
      user.companyProfile
        ? db.planRequest.count({ where: { companyId: user.companyProfile.id } })
        : Promise.resolve(0),
      db.walletTopUp.count({ where: { wallet: { userId } } }),
      db.campaign.count({ where: { userId } }),
      // Pedidos de materiales: como comprador o como proveedor.
      db.supplyOrder.count({ where: { OR: [{ buyerId: userId }, { supplier: { userId } }] } }),
      // Suscripciones y pagos de Mercado Pago (historial de facturación).
      Promise.all([db.subscription.count({ where: { userId } }), db.mpPayment.count({ where: { userId } })]).then(([a, b]) => a + b),
    ]);

  const hasHistory =
    jobs + reviews + messages + conversations + reports + applications + planRequests + topUps + campaigns + supplyOrders + mpBilling > 0;
  if (hasHistory) {
    return {
      ok: false,
      reason: "La cuenta ya tiene trabajos, pedidos, pagos, mensajes, reseñas o denuncias asociadas.",
    };
  }

  if (user.avatarUrl) await deleteUpload(user.avatarUrl).catch(() => {});
  if (user.workerProfile?.gallery) {
    try {
      const gallery: string[] = JSON.parse(user.workerProfile.gallery);
      for (const url of gallery) await deleteUpload(url).catch(() => {});
    } catch {
      /* galería inválida: se ignora */
    }
  }

  // El resto (perfil de trabajador/empresa, publicaciones, wallet, tokens) se
  // borra en cascada por el esquema.
  await db.user.delete({ where: { id: userId } });
  return { ok: true };
}
