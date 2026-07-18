import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toggleOffer, setApplicationStatus } from "@/lib/actions/offers";
import { updateCompanyProfile } from "@/lib/actions/profile";
import { openConversation } from "@/lib/actions/chat";
import { Avatar } from "@/components/Avatar";
import { GeoField } from "@/components/GeoField";
import { formatDate } from "@/lib/format";
import { isSponsored, daysLeft } from "@/lib/company";
import { benefitsFor, isUnlimited, benefitList } from "@/lib/plans";

const APP_STATUS: Record<string, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
};

export default async function CompanyDashboard({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "COMPANY" || !me.companyProfile) redirect("/app");
  const sp = await searchParams;

  const company = await db.companyProfile.findUnique({
    where: { userId: me.id },
    include: {
      offers: {
        include: { applications: { include: { worker: true } }, category: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!company) redirect("/app");
  const pending = company.offers.flatMap((o) => o.applications).filter((a) => a.status === "PENDING").length;
  const plan = await benefitsFor(company);
  const planActive = plan.key !== "NONE";
  const planDays = daysLeft(company.planActiveUntil);
  const activeOffers = company.offers.filter((o) => o.active).length;
  const atLimit = planActive && !isUnlimited(plan.jobPostLimit) && activeOffers >= plan.jobPostLimit;

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{company.companyName}</h1>
        <p className="text-sm text-muted">Panel de empresa</p>
      </div>

      {sp.ok === "plan" && (
        <div className="card p-4 border-fg bg-surface-2">
          <p className="text-sm font-medium">✓ Plan activado. Ya podés publicar empleos y aparecer en Better Work.</p>
        </div>
      )}

      {sp.error === "limite" && (
        <div className="card p-4 border-fg">
          <p className="text-sm font-medium">
            Llegaste al tope de {plan.jobPostLimit} {plan.jobPostLimit === 1 ? "empleo activo" : "empleos activos"} del
            plan {plan.name}.
          </p>
          <p className="text-xs text-muted mt-0.5">Pausá alguno o pasá a un plan con más lugar.</p>
          <Link href="/company/plan" className="btn-primary w-full mt-3 !py-2 !text-xs">Mejorar mi plan</Link>
        </div>
      )}

      {/* Estado de la membresía */}
      {planActive ? (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Plan {plan.name} activo</p>
              <p className="text-xs text-muted">
                Vence el {formatDate(company.planActiveUntil!)}{planDays != null && ` · ${planDays} días`}.
                {isSponsored(company.sponsoredUntil) && " · Empresa destacada ★"}
              </p>
            </div>
            <Link href="/company/plan" className="btn-secondary shrink-0 !py-1.5 !px-3 !text-xs">Cambiar</Link>
          </div>
          <ul className="mt-3 pt-3 border-t border-line space-y-1">
            {benefitList(plan).map((b) => (
              <li key={b} className="text-xs text-muted flex gap-1.5">
                <span className="text-fg">✓</span> {b}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card p-5 bg-fg text-bg">
          <p className="font-semibold">Activá un plan para usar las funciones empresariales</p>
          <p className="text-sm text-bg/70 mt-1">
            Sin un plan activo tu empresa no aparece en Better Work, no podés publicar empleos ni contratar
            trabajadores. Tu cuenta queda guardada: se reactiva todo al activar el plan.
          </p>
          <Link href="/company/plan" className="btn-secondary w-full mt-4 !bg-bg !text-fg">Ver planes</Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          [isUnlimited(plan.jobPostLimit) ? String(activeOffers) : `${activeOffers}/${plan.jobPostLimit}`, "Ofertas activas"],
          [String(pending), "Postulaciones nuevas"],
          [company.verified ? "Sí" : "No", "Verificada"],
        ].map(([v, l]) => (
          <div key={l} className="card p-3 text-center">
            <p className="font-bold">{v}</p>
            <p className="text-[11px] text-faint mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Ofertas */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Mis ofertas</h2>
          <Link
            href={!planActive || atLimit ? "/company/plan" : "/company/offers/new"}
            className="btn-primary !py-2 !px-3 !text-xs"
          >
            + Publicar oferta
          </Link>
        </div>
        {planActive && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Link href="/ads/new" className="card p-3.5 hover:bg-surface-2 transition">
              <p className="text-sm font-medium">★ Publicidad</p>
              <p className="text-xs text-muted mt-0.5">Aparecé primero en el mapa y los listados.</p>
            </Link>
            <Link href="/company/dashboard" className="card p-3.5 hover:bg-surface-2 transition">
              <p className="text-sm font-medium">📊 Métricas</p>
              <p className="text-xs text-muted mt-0.5">Postulaciones, contrataciones y visitas.</p>
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {company.offers.map((o) => {
            const toggle = toggleOffer.bind(null, o.id);
            // Cada plan define cuántas postulaciones se ven por oferta.
            const visibleApps = isUnlimited(plan.applicantLimit)
              ? o.applications
              : o.applications.slice(0, plan.applicantLimit);
            const hiddenApps = o.applications.length - visibleApps.length;
            return (
              <div key={o.id} className={`card p-4 ${o.active ? "" : "opacity-60"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{o.title}</p>
                    <p className="text-xs text-muted">
                      {formatDate(o.createdAt)} · {o.applications.length} postulaciones
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <form action={toggle}>
                      <button className="btn-ghost !py-1.5 !px-2.5 !text-xs">{o.active ? "Pausar" : "Activar"}</button>
                    </form>
                  </div>
                </div>

                {visibleApps.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-line pt-3">
                    {visibleApps.map((a) => {
                      const acceptApp = setApplicationStatus.bind(null, a.id, "ACCEPTED" as const);
                      const rejectApp = setApplicationStatus.bind(null, a.id, "REJECTED" as const);
                      const chat = openConversation.bind(null, a.workerId);
                      return (
                        <div key={a.id} className="flex items-center gap-2.5">
                          <Avatar name={a.worker.name} url={a.worker.avatarUrl} size={34} />
                          <div className="flex-1 min-w-0">
                            <Link href={`/w/${a.workerId}`} className="text-sm font-medium hover:underline">{a.worker.name}</Link>
                            {a.message && <p className="text-xs text-muted truncate">{a.message}</p>}
                          </div>
                          {a.status === "PENDING" ? (
                            <div className="flex gap-1 shrink-0">
                              <form action={acceptApp}><button className="btn-primary !py-1 !px-2 !text-[11px]">Aceptar</button></form>
                              <form action={rejectApp}><button className="btn-ghost !py-1 !px-2 !text-[11px]">Rechazar</button></form>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${a.status === "ACCEPTED" ? "bg-fg text-bg" : "bg-surface-2 text-muted"}`}>
                                {APP_STATUS[a.status]}
                              </span>
                              {a.status === "ACCEPTED" && (
                                <form action={chat}><button className="btn-secondary !py-1 !px-2 !text-[11px]">Chat</button></form>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {hiddenApps > 0 && (
                      <Link href="/company/plan" className="block text-center text-xs text-muted hover:text-fg transition pt-1">
                        +{hiddenApps} {hiddenApps === 1 ? "postulación oculta" : "postulaciones ocultas"} · mejorá tu plan para verlas →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {company.offers.length === 0 && (
            <div className="card p-6 text-center text-sm text-faint">Todavía no publicaste ofertas.</div>
          )}
        </div>
      </section>

      {/* Perfil de empresa */}
      <section>
        <h2 className="font-bold text-lg mb-3">Perfil de la empresa</h2>
        <form action={updateCompanyProfile} className="card p-5 space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input name="companyName" required defaultValue={company.companyName} className="input" />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea name="description" defaultValue={company.description} className="input min-h-20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rubro</label>
              <input name="industry" defaultValue={company.industry} className="input" />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input name="city" defaultValue={company.city} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Sitio web</label>
            <input name="website" defaultValue={company.website ?? ""} className="input" placeholder="https://…" />
          </div>
          <div>
            <label className="label">Ubicación (aparece en el mapa)</label>
            <GeoField lat={company.lat} lng={company.lng} />
          </div>
          <button className="btn-primary w-full">Guardar</button>
        </form>
      </section>
    </main>
  );
}
