import Link from "next/link";
import { db } from "@/lib/db";
import { toggleSuspended, toggleWorkerVerified, toggleCompanyVerified } from "@/lib/actions/admin";
import { Avatar } from "@/components/Avatar";
import { formatDate } from "@/lib/format";

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Cliente",
  WORKER: "Trabajador",
  COMPANY: "Empresa",
  ADMIN: "Admin",
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const sp = await searchParams;

  const users = await db.user.findMany({
    where: {
      ...(sp.role ? { role: sp.role } : {}),
      ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }] } : {}),
    },
    include: { workerProfile: true, companyProfile: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Usuarios</h1>

      <form className="flex gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nombre o email…" className="input" />
        <select name="role" defaultValue={sp.role ?? ""} className="input !w-40">
          <option value="">Todos</option>
          <option value="CLIENT">Clientes</option>
          <option value="WORKER">Trabajadores</option>
          <option value="COMPANY">Empresas</option>
        </select>
        <button className="btn-primary shrink-0">Filtrar</button>
      </form>

      <div className="space-y-2">
        {users.map((u) => {
          const suspend = toggleSuspended.bind(null, u.id);
          return (
            <div key={u.id} className={`card p-4 flex items-center gap-3 flex-wrap ${u.suspended ? "opacity-60" : ""}`}>
              <Avatar name={u.name} url={u.avatarUrl} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {u.workerProfile ? (
                    <Link href={`/w/${u.id}`} className="font-semibold text-sm hover:underline">{u.name}</Link>
                  ) : (
                    <p className="font-semibold text-sm">{u.name}</p>
                  )}
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium">{ROLE_LABEL[u.role]}</span>
                  {u.suspended && <span className="rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-[11px] font-medium">Suspendido</span>}
                  {(u.workerProfile?.verified || u.companyProfile?.verified) && (
                    <span className="rounded-full bg-fg text-bg px-2 py-0.5 text-[11px] font-medium">✓ Verificado</span>
                  )}
                </div>
                <p className="text-xs text-muted">{u.email} · registrado el {formatDate(u.createdAt)}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {u.workerProfile && (
                  <form action={toggleWorkerVerified.bind(null, u.workerProfile.id)}>
                    <button className="btn-secondary !py-1.5 !px-2.5 !text-xs">
                      {u.workerProfile.verified ? "Quitar verificación" : "Verificar"}
                    </button>
                  </form>
                )}
                {u.companyProfile && (
                  <form action={toggleCompanyVerified.bind(null, u.companyProfile.id)}>
                    <button className="btn-secondary !py-1.5 !px-2.5 !text-xs">
                      {u.companyProfile.verified ? "Quitar verificación" : "Verificar"}
                    </button>
                  </form>
                )}
                {u.role !== "ADMIN" && (
                  <form action={suspend}>
                    <button className="btn-ghost !py-1.5 !px-2.5 !text-xs text-red-600">
                      {u.suspended ? "Reactivar" : "Suspender"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
