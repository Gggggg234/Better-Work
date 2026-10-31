import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { siteOrigin } from "@/lib/site";
import { escrowActive } from "@/lib/payments";
import { isPro } from "@/lib/pro";
import { formatDate } from "@/lib/format";
import {
  referralCodeFor,
  WELCOME_FREE_JOBS,
  REWARD_FREE_JOBS,
  MAX_FREE_JOBS,
  WELCOME_PRO_DAYS,
  REWARD_PRO_DAYS,
} from "@/lib/referrals";
import { BackButton } from "@/components/BackButton";
import { ShareInvite } from "@/components/ShareInvite";

export default async function InvitePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const isWorker = me.role === "WORKER";
  // Un profesional suele invitar a colegas: su link preselecciona "Trabajador".
  const code = await referralCodeFor(me.id);
  const link = `${siteOrigin()}/r/${code}${isWorker ? "?rol=trabajador" : ""}`;

  const [invited, completed, escrow] = await Promise.all([
    db.user.count({ where: { referredById: me.id } }),
    db.user.count({ where: { referredById: me.id, referralRewarded: true } }),
    escrowActive(),
  ]);

  // Qué gana quien invita. Con pago directo el premio es Pro, que sólo existe
  // para profesionales: el resto puede recomendar, pero sin premio.
  const reward = escrow
    ? `${REWARD_FREE_JOBS} trabajos ${isWorker ? "sin comisión" : "sin tarifa de servicio"}`
    : isWorker
      ? `${REWARD_PRO_DAYS} días de Better Work Pro`
      : null;

  const message = isWorker
    ? escrow
      ? "Sumate a Better Work: te llegan pedidos de clientes de tu zona. Con mi link tu primer trabajo va sin comisión:"
      : `Sumate a Better Work: te llegan pedidos de clientes de tu zona y pasás tus propios presupuestos. Con mi link arrancás con ${WELCOME_PRO_DAYS} días de Pro gratis:`
    : "Probá Better Work para encontrar profesionales de confianza cerca tuyo, con presupuesto y calificaciones reales:";

  const proUntil = me.workerProfile?.proUntil;

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 space-y-6 animate-fade-up">
      <div>
        <BackButton fallback="/app" />
        <h1 className="text-2xl font-bold">{reward ? "Invitá y ganá" : "Recomendá Better Work"}</h1>
        <p className="text-sm text-muted mt-1">
          {reward
            ? `Por cada persona que invites y complete su primer trabajo, ganás ${reward}.`
            : "Compartí Better Work con quien necesite un profesional de confianza."}
        </p>
      </div>

      {escrow && me.freeJobs > 0 && (
        <div className="card p-4 bg-fg text-bg !border-fg">
          <p className="text-sm font-semibold">
            🎁 Tenés {me.freeJobs} {me.freeJobs === 1 ? "trabajo bonificado" : "trabajos bonificados"}
          </p>
          <p className="text-xs text-bg/70 mt-0.5">
            {isWorker
              ? "En tus próximos trabajos no te descontamos la comisión. Se aplica sola al liberarse el pago."
              : "En tus próximos trabajos no pagás la tarifa de servicio. Se aplica sola al pagar."}
          </p>
        </div>
      )}
      {!escrow && isWorker && isPro(proUntil) && (
        <Link href="/pro" className="card p-4 bg-fg text-bg !border-fg block">
          <p className="text-sm font-semibold">⭐ Sos Pro hasta el {formatDate(proUntil!)}</p>
          <p className="text-xs text-bg/70 mt-0.5">Cada invitado que complete un trabajo te suma {REWARD_PRO_DAYS} días más.</p>
        </Link>
      )}

      <section className="card p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-faint">Tu código</p>
          <p className="text-3xl font-bold tracking-[0.3em] font-mono mt-1">{code}</p>
        </div>
        <ShareInvite link={link} message={message} />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-lg font-bold">{invited}</p>
          <p className="text-xs text-faint">Se sumaron</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{completed}</p>
          <p className="text-xs text-faint">Completaron un trabajo</p>
        </div>
      </section>

      {reward && (
        <section>
          <h2 className="font-semibold">Cómo funciona</h2>
          <ol className="mt-3 space-y-2.5 text-sm">
            {[
              isWorker
                ? "Compartí tu link con colegas y con clientes que necesiten un profesional."
                : "Compartí tu link con profesionales o con gente que necesite contratar.",
              escrow
                ? `Quien se suma con tu link tiene ${WELCOME_FREE_JOBS === 1 ? "su primer trabajo" : `sus primeros ${WELCOME_FREE_JOBS} trabajos`} sin comisión (si es profesional) o sin tarifa de servicio (si contrata).`
                : `Si es profesional, arranca con ${WELCOME_PRO_DAYS} días de Better Work Pro gratis.`,
              `Cuando completa su primer trabajo, vos ganás ${reward}.`,
            ].map((step, i) => (
              <li key={step} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-fg text-bg text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-muted">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-faint mt-3">
            Cuenta un trabajo real terminado con código de finalización, hecho con alguien que no seas vos.{" "}
            {escrow
              ? `Podés acumular hasta ${MAX_FREE_JOBS} trabajos bonificados.`
              : "Los días de Pro se suman (hasta 6 meses por delante)."}
          </p>
        </section>
      )}
    </main>
  );
}
