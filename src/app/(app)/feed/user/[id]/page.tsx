import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PostCard } from "@/components/feed/PostCard";
import { Avatar } from "@/components/Avatar";
import { postInclude, mapPost } from "@/lib/feed";

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Cliente",
  WORKER: "Trabajador",
  COMPANY: "Empresa",
  ADMIN: "Better Work",
};

export default async function UserPostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const author = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatarUrl: true, role: true, suspended: true, workerProfile: { select: { userId: true } } },
  });
  if (!author || author.suspended) notFound();

  const raw = await db.post.findMany({
    where: { authorId: id, hidden: false },
    include: postInclude(me.id),
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const posts = raw.map((p) => mapPost(p, me.id, me.role));
  const isSelf = id === me.id;

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <Link href="/feed" className="btn-ghost !px-2 -ml-2 mb-2 !text-sm">← Volver al feed</Link>

      <div className="flex items-center gap-3.5">
        <Avatar name={author.name} url={author.avatarUrl} size={56} />
        <div>
          <h1 className="text-xl font-bold">{author.name}</h1>
          <p className="text-sm text-muted">{ROLE_LABEL[author.role] ?? "Usuario"}</p>
        </div>
        {author.workerProfile && (
          <Link href={`/w/${author.id}`} className="btn-secondary ml-auto !py-1.5 !px-3 !text-xs">Ver perfil</Link>
        )}
      </div>

      <h2 className="font-semibold mt-6 mb-3">{isSelf ? "Mis publicaciones" : "Publicaciones"} ({posts.length})</h2>
      <div className="space-y-3">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {posts.length === 0 && (
          <div className="card p-8 text-center text-sm text-faint">Sin publicaciones todavía.</div>
        )}
      </div>
    </main>
  );
}
