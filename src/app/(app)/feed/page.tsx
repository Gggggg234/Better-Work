import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createPost } from "@/lib/actions/feed";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { postInclude, mapPost } from "@/lib/feed";
import { postScore } from "@/lib/ranking";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const sp = await searchParams;

  const raw = await db.post.findMany({
    where: { hidden: false },
    include: postInclude(me.id),
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const posts = raw
    .map((p) => ({ post: mapPost(p, me.id, me.role), raw: p }))
    .sort(
      (a, b) =>
        postScore({ sponsored: a.post.sponsored, createdAt: a.post.createdAt, likeCount: a.post.likeCount, commentCount: a.post.commentCount }) <
        postScore({ sponsored: b.post.sponsored, createdAt: b.post.createdAt, likeCount: b.post.likeCount, commentCount: b.post.commentCount })
          ? 1
          : -1
    )
    .map((x) => x.post);

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Comunidad</h1>
        <Link href="/feed/saved" className="btn-secondary !py-1.5 !px-3 !text-xs">Guardados</Link>
      </div>

      <PostComposer name={me.name} avatarUrl={me.avatarUrl} action={createPost} />
      {sp.error === "vacio" && <p className="text-sm text-red-600 mt-2">Escribí algo o agregá una foto.</p>}

      <div className="space-y-3 mt-4">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {posts.length === 0 && (
          <div className="card p-8 text-center text-sm text-faint">
            Todavía no hay publicaciones. ¡Sé el primero en compartir algo!
          </div>
        )}
      </div>
    </main>
  );
}
