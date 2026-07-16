import Link from "next/link";
import { db } from "@/lib/db";
import { togglePostHidden, adminDeletePost, resolvePostReport } from "@/lib/actions/admin";
import { Avatar } from "@/components/Avatar";
import { postKindLabel } from "@/lib/feed";
import { formatDateTime, timeAgo } from "@/lib/format";

export default async function AdminPostsPage() {
  const [reported, recent] = await Promise.all([
    // Publicaciones con denuncias abiertas primero.
    db.post.findMany({
      where: { reports: { some: { status: "OPEN" } } },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        reports: { where: { status: "OPEN" }, include: { reporter: { select: { name: true } } } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.post.findMany({
      include: { author: { select: { id: true, name: true, avatarUrl: true } }, _count: { select: { reports: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Moderación del feed</h1>
        <p className="text-sm text-muted mt-0.5">Revisá denuncias, ocultá o eliminá publicaciones.</p>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Denunciadas ({reported.length})</h2>
        <div className="space-y-3">
          {reported.map((p) => (
            <div key={p.id} className="card p-4 border-red-200">
              <div className="flex items-center gap-2.5">
                <Avatar name={p.author.name} url={p.author.avatarUrl} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.author.name}</p>
                  <p className="text-xs text-faint">{postKindLabel(p.kind)} · {formatDateTime(p.createdAt)}</p>
                </div>
                <Link href={`/feed/${p.id}`} className="btn-secondary !py-1.5 !px-2.5 !text-xs shrink-0">Ver</Link>
              </div>
              {p.content && <p className="text-sm text-muted mt-2 line-clamp-3">{p.content}</p>}
              <div className="mt-2 space-y-1">
                {p.reports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted">🚩 {r.reason} — {r.reporter.name}</span>
                    <div className="flex gap-1.5">
                      <form action={resolvePostReport.bind(null, r.id, "DISMISSED" as const)}>
                        <button className="btn-ghost !py-1 !px-2 !text-[11px]">Descartar</button>
                      </form>
                      <form action={resolvePostReport.bind(null, r.id, "RESOLVED" as const)}>
                        <button className="btn-secondary !py-1 !px-2 !text-[11px]">Resuelta</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-3">
                <form action={togglePostHidden.bind(null, p.id)}>
                  <button className="btn-secondary !py-1.5 !px-2.5 !text-xs">{p.hidden ? "Mostrar" : "Ocultar"}</button>
                </form>
                <form action={adminDeletePost.bind(null, p.id)}>
                  <button className="btn-ghost !py-1.5 !px-2.5 !text-xs text-red-600">Eliminar</button>
                </form>
              </div>
            </div>
          ))}
          {reported.length === 0 && (
            <div className="card p-6 text-center text-sm text-faint">No hay publicaciones denunciadas. 🎉</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Publicaciones recientes</h2>
        <div className="card divide-y divide-line">
          {recent.map((p) => (
            <div key={p.id} className={`p-4 flex items-center gap-3 text-sm ${p.hidden ? "opacity-50" : ""}`}>
              <Avatar name={p.author.name} url={p.author.avatarUrl} size={32} />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.content || postKindLabel(p.kind)}</p>
                <p className="text-xs text-faint">{p.author.name} · {timeAgo(p.createdAt)}{p.hidden ? " · Oculta" : ""}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <form action={togglePostHidden.bind(null, p.id)}>
                  <button className="btn-ghost !py-1.5 !px-2.5 !text-xs">{p.hidden ? "Mostrar" : "Ocultar"}</button>
                </form>
                <form action={adminDeletePost.bind(null, p.id)}>
                  <button className="btn-ghost !py-1.5 !px-2.5 !text-xs text-red-600">Eliminar</button>
                </form>
              </div>
            </div>
          ))}
          {recent.length === 0 && <p className="p-6 text-center text-sm text-faint">Sin publicaciones.</p>}
        </div>
      </section>
    </div>
  );
}
