import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PostCard } from "@/components/feed/PostCard";
import { postInclude, mapPost } from "@/lib/feed";

export default async function SavedPostsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const saves = await db.postSave.findMany({
    where: { userId: me.id, post: { hidden: false } },
    include: { post: { include: postInclude(me.id) } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const posts = saves.map((s) => mapPost(s.post, me.id, me.role));

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <Link href="/feed" className="btn-ghost !px-2 -ml-2 mb-2 !text-sm">← Volver al feed</Link>
      <h1 className="text-2xl font-bold">Guardados</h1>

      <div className="space-y-3 mt-4">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {posts.length === 0 && (
          <div className="card p-8 text-center text-sm text-faint">No guardaste ninguna publicación todavía.</div>
        )}
      </div>
    </main>
  );
}
