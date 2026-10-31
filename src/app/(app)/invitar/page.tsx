import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { siteOrigin } from "@/lib/site";
import { referralCodeFor, WELCOME_FREE_JOBS, REWARD_FREE_JOBS, MAX_FREE_JOBS } from "@/lib/referrals";
import { BackButton } from "@/components/BackButton";
import { ShareInvite } from "@/components/ShareInvite";

export default async function InvitePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const isWorker = me.role === "WORKER";
  // Un profesional suele invitar a colegas: su link preselecciona "Trabajador".
  const code = await referralCodeFor(me.id);
  const link = `${siteOrigin()}/r/${code}${isWorker ? "?rol=trabajador" : ""}`;

  const [invited, completed] = await Promise.all([
    db.user.count({ where: { referredById: me.id } }),
    db.user.count({ where: { referredById: me.id, referralRewarded: true } }),
  ]);

  const perk = isWorker ? "sin comisión" : "sin tarifa de servicio";
  const message = isWorker
    ? "Sumate a Better Work: te llegan pedidos de clientes de tu zona y cobrás seguro. Con mi link tu primer trabajo va sin comisión:"
    : "Probá Better Work para encontrar profesionales de confianza: pagás protegido hasta que el trabajo esté terminado. Con mi link tu primer trabajo va sin tarifa:";

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 space-y-6 animate-fade-up">
      <div>
        <BackButton fallback="/app" />
        <h1 className="text-2xl font-bold">Invitá y ganá</h1>
        <p className="text-sm text-muted mt-1">
          Por cada persona que invites y complete su primer trabajo, ganás {REWARD_FREE_JOBS} trabajos {perk}.
        </p>
      </div>

      {me.freeJobs > 0 && (
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

      <section className="card p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-faint">Tu código</p>
          <p className="text-3xl font-bold tracking-[0.3em] font-mono mt-1">{code}</p>
        </div>
        <ShareInvite link={link} message={message} />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-lg font-bold">{invited}</p>
          <p className="text-xs text-faint">Se sumaron</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{completed}</p>
          <p className="text-xs text-faint">Completaron un trabajo</p>
        </div>
        <div className="card p-4">
          <p className="text-lg font-bold">{me.freeJobs}</p>
          <p className="text-xs text-faint">Bonificados para vos</p>
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Cómo funciona</h2>
        <ol className="mt-3 space-y-2.5 text-sm">
          {[
            "Compartí tu link con profesionales o con gente que necesite contratar.",
            `Quien se suma con tu link tiene ${WELCOME_FREE_JOBS === 1 ? "su primer trabajo" : `sus primeros ${WELCOME_FREE_JOBS} trabajos`} sin comisión (si es profesional) o sin tarifa de servicio (si contrata).`,
            `Cuando completa su primer trabajo, vos ganás ${REWARD_FREE_JOBS} trabajos ${perk}.`,
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
          Cuenta un trabajo real terminado con pago y código de finalización, hecho con otra persona (no con vos).
          Podés acumular hasta {MAX_FREE_JOBS} trabajos bonificados.
        </p>
      </section>
    </main>
  );
}
