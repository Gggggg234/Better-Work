import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { updateAvatar } from "@/lib/actions/profile";
import { AvatarUpload } from "@/components/AvatarUpload";
import { RankBadge } from "@/components/Badges";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallButton } from "@/components/InstallButton";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { computeRank, rankProgress } from "@/lib/rank";

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Cliente",
  WORKER: "Trabajador",
  COMPANY: "Empresa",
  ADMIN: "Administrador",
};

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const links: [string, string][] = [];
  if (me.role === "WORKER") {
    links.push(["/worker/profile", "Editar perfil profesional"]);
    links.push([`/w/${me.id}`, "Ver mi perfil público"]);
    links.push(["/promote", "★ Destacar mi perfil"]);
    links.push(["/payments", "Cuenta de cobro"]);
    links.push(["/offers", "Ofertas de empleo"]);
  }
  if (me.role === "CLIENT") {
    links.push(["/payments", "Métodos de pago"]);
  }
  if (me.role === "COMPANY") {
    links.push(["/company", "Panel de empresa"]);
    links.push(["/company/plan", "Plan Premium"]);
    links.push(["/payments", "Métodos de pago"]);
  }
  if (me.role === "ADMIN") {
    links.push(["/admin", "Panel administrativo"]);
  }
  links.push([`/feed/user/${me.id}`, "Mis publicaciones"]);
  links.push(["/jobs", "Mis trabajos"]);
  links.push(["/chat", "Mensajes"]);

  const wp = me.workerProfile;

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <div className="flex items-center gap-4">
        <AvatarUpload name={me.name} url={me.avatarUrl} action={updateAvatar} />
        <div>
          <h1 className="text-xl font-bold">{me.name}</h1>
          <p className="text-sm text-muted">{me.email}</p>
          <span className="inline-block mt-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium">
            {ROLE_LABEL[me.role]}
          </span>
        </div>
      </div>

      {wp && (
        <div className="card p-5 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Tu rango</p>
            <RankBadge rank={computeRank(wp.jobsDone, wp.ratingAvg, wp.cancellations)} />
          </div>
          {(() => {
            const prog = rankProgress(wp.jobsDone);
            return (
              <>
                <div className="h-1.5 rounded-full bg-surface-2 mt-3 overflow-hidden">
                  <div className="h-full bg-fg rounded-full transition-all" style={{ width: `${prog.pct}%` }} />
                </div>
                <p className="text-xs text-faint mt-2">
                  {prog.next
                    ? `${wp.jobsDone} trabajos completados — siguiente rango: ${prog.next}`
                    : "¡Alcanzaste el rango máximo!"}
                </p>
              </>
            );
          })()}
        </div>
      )}

      <div className="card divide-y divide-line mt-6">
        {links.map(([href, label]) => (
          <Link key={href + label} href={href} className="flex items-center justify-between p-4 text-sm font-medium hover:bg-surface-2 transition first:rounded-t-2xl last:rounded-b-2xl">
            {label} <span className="text-faint">→</span>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="label !mb-2">Apariencia</h2>
        <ThemeToggle />
      </div>

      {/* Instalar la app (solo si el dispositivo lo permite y no está instalada) */}
      <div className="mt-6">
        <InstallButton className="w-full !py-3" />
      </div>

      <div className="mt-3">
        <ChangePasswordForm />
      </div>

      <form action={logout} className="mt-6">
        <button className="btn-secondary w-full text-red-600 !border-red-200 hover:!bg-red-500/10">Cerrar sesión</button>
      </form>
    </main>
  );
}
