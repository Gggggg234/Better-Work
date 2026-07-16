/** Tipos de publicación del feed (opciones fijas, se eligen con chips). */
export const POST_KINDS: { value: string; label: string; icon: string }[] = [
  { value: "GENERAL", label: "General", icon: "💬" },
  { value: "WORK_DONE", label: "Trabajo terminado", icon: "✅" },
  { value: "BEFORE_AFTER", label: "Antes y después", icon: "🔁" },
  { value: "PROMO", label: "Promoción", icon: "🏷️" },
  { value: "HIRING", label: "Busco empleados", icon: "🧑‍🔧" },
  { value: "JOB_SEEK", label: "Busco trabajo", icon: "🔎" },
  { value: "TIP", label: "Consejo", icon: "💡" },
  { value: "NEWS", label: "Novedad", icon: "📰" },
];

export function postKindLabel(kind: string): string {
  return POST_KINDS.find((k) => k.value === kind)?.label ?? "General";
}

export function postKindIcon(kind: string): string {
  return POST_KINDS.find((k) => k.value === kind)?.icon ?? "💬";
}

export const POST_KIND_VALUES = POST_KINDS.map((k) => k.value);

export type FeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  kind: string;
  images: string[];
  locationLabel: string;
  lat: number | null;
  lng: number | null;
  sponsored: boolean;
  createdAt: Date;
  shareCount: number;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  canManage: boolean;
};

/** include reutilizable para traer una publicación con el estado del usuario. */
export function postInclude(meId: string) {
  return {
    author: { select: { id: true, name: true, avatarUrl: true } },
    _count: { select: { likes: true, comments: true } },
    likes: { where: { userId: meId }, select: { id: true }, take: 1 },
    saves: { where: { userId: meId }, select: { id: true }, take: 1 },
  } as const;
}

type RawPost = {
  id: string;
  authorId: string;
  author: { name: string; avatarUrl: string | null };
  content: string;
  kind: string;
  images: string;
  locationLabel: string;
  lat: number | null;
  lng: number | null;
  sponsoredUntil: Date | null;
  createdAt: Date;
  shareCount: number;
  _count: { likes: number; comments: number };
  likes: { id: string }[];
  saves: { id: string }[];
};

/** Convierte una publicación de Prisma al shape que usa la UI. */
export function mapPost(p: RawPost, meId: string, meRole: string): FeedPost {
  let images: string[] = [];
  try {
    const parsed = JSON.parse(p.images || "[]");
    if (Array.isArray(parsed)) images = parsed.filter((x) => typeof x === "string");
  } catch {
    images = [];
  }
  return {
    id: p.id,
    authorId: p.authorId,
    authorName: p.author.name,
    authorAvatar: p.author.avatarUrl,
    content: p.content,
    kind: p.kind,
    images,
    locationLabel: p.locationLabel,
    lat: p.lat,
    lng: p.lng,
    sponsored: !!(p.sponsoredUntil && p.sponsoredUntil.getTime() > Date.now()),
    createdAt: p.createdAt,
    shareCount: p.shareCount,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    liked: p.likes.length > 0,
    saved: p.saves.length > 0,
    canManage: p.authorId === meId || meRole === "ADMIN",
  };
}
