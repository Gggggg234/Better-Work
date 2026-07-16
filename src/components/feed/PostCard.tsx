import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SponsoredBadge } from "@/components/Badges";
import { PostShareReport } from "./PostShareReport";
import { toggleLike, toggleSave, sharePost, reportPost, deletePost } from "@/lib/actions/feed";
import { postKindLabel, postKindIcon, type FeedPost } from "@/lib/feed";
import { timeAgo } from "@/lib/format";

function ImageGrid({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  const cols = images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={`grid ${cols} gap-1 mt-3 rounded-xl overflow-hidden`}>
      {images.slice(0, 6).map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className={`w-full object-cover ${images.length === 1 ? "max-h-96" : "aspect-square"}`}
        />
      ))}
    </div>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  const like = toggleLike.bind(null, post.id);
  const save = toggleSave.bind(null, post.id);
  const share = sharePost.bind(null, post.id);
  const report = reportPost.bind(null, post.id);
  const remove = deletePost.bind(null, post.id);

  return (
    <article className="card p-4">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link href={`/feed/user/${post.authorId}`}>
          <Avatar name={post.authorName} url={post.authorAvatar} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/feed/user/${post.authorId}`} className="font-semibold text-sm hover:underline">
              {post.authorName}
            </Link>
            {post.sponsored && <SponsoredBadge />}
          </div>
          <p className="text-xs text-faint">
            {postKindIcon(post.kind)} {postKindLabel(post.kind)} · {timeAgo(post.createdAt)}
            {post.locationLabel && ` · 📍 ${post.locationLabel}`}
          </p>
        </div>
        {post.canManage && (
          <form action={remove}>
            <button className="text-faint hover:text-red-600 transition text-xs" title="Eliminar">✕</button>
          </form>
        )}
      </div>

      {post.content && <p className="text-sm mt-3 whitespace-pre-wrap break-words">{post.content}</p>}
      <ImageGrid images={post.images} />

      {/* Métricas */}
      {(post.likeCount > 0 || post.commentCount > 0) && (
        <p className="text-xs text-faint mt-3">
          {post.likeCount > 0 && `${post.likeCount} me gusta`}
          {post.likeCount > 0 && post.commentCount > 0 && " · "}
          {post.commentCount > 0 && `${post.commentCount} comentarios`}
        </p>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-line text-sm">
        <form action={like}>
          <button className={`flex items-center gap-1.5 transition ${post.liked ? "text-fg font-medium" : "text-muted hover:text-fg"}`}>
            <svg viewBox="0 0 24 24" fill={post.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
              <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z" strokeLinejoin="round" />
            </svg>
            {post.likeCount > 0 ? post.likeCount : "Me gusta"}
          </button>
        </form>

        <Link href={`/feed/${post.id}`} className="flex items-center gap-1.5 text-muted hover:text-fg transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
            <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" strokeLinejoin="round" />
          </svg>
          {post.commentCount > 0 ? post.commentCount : "Comentar"}
        </Link>

        <PostShareReport
          postId={post.id}
          shareCount={post.shareCount}
          onShare={share}
          onReport={report}
          canReport={!post.canManage}
        />

        <div className="flex-1" />

        <form action={save}>
          <button className={`transition ${post.saved ? "text-fg" : "text-muted hover:text-fg"}`} title="Guardar">
            <svg viewBox="0 0 24 24" fill={post.saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </article>
  );
}
