import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addComment } from "@/lib/actions/feed";
import { PostCard } from "@/components/feed/PostCard";
import { Avatar } from "@/components/Avatar";
import { postInclude, mapPost } from "@/lib/feed";
import { timeAgo } from "@/lib/format";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const raw = await db.post.findUnique({ where: { id }, include: postInclude(me.id) });
  if (!raw || (raw.hidden && me.role !== "ADMIN")) notFound();
  const post = mapPost(raw, me.id, me.role);

  const comments = await db.postComment.findMany({
    where: { postId: id },
    include: { author: { select: { name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const comment = addComment.bind(null, id);

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <Link href="/feed" className="btn-ghost !px-2 -ml-2 mb-2 !text-sm">← Volver al feed</Link>

      <PostCard post={post} />

      {/* El autor promociona su perfil, no la publicación suelta */}
      {post.authorId === me.id && (me.role === "WORKER" || me.role === "COMPANY") && (
        <Link href="/ads/new" className="card p-3.5 mt-3 flex items-center justify-between hover:bg-surface-2 transition">
          <div>
            <p className="text-sm font-medium">★ Llegá a más gente</p>
            <p className="text-xs text-muted">Creá una campaña y aparecé primero en búsquedas y mapa.</p>
          </div>
          <span className="text-faint">→</span>
        </Link>
      )}

      {/* Comentarios */}
      <section className="mt-5">
        <h2 className="font-semibold mb-2">Comentarios ({comments.length})</h2>
        <form action={comment} className="flex items-center gap-2 mb-4">
          <input name="content" required placeholder="Escribí un comentario…" className="input" maxLength={1000} />
          <button className="btn-primary shrink-0 !px-4">Enviar</button>
        </form>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar name={c.author.name} url={c.author.avatarUrl} size={32} />
              <div className="card p-3 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{c.author.name}</p>
                  <span className="text-[11px] text-faint">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-muted mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-faint">Sé el primero en comentar.</p>}
        </div>
      </section>
    </main>
  );
}
