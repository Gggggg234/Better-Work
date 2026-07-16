"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { trySaveImage } from "@/lib/upload";
import { POST_KIND_VALUES } from "@/lib/feed";

const MAX_IMAGES = 6;

/** Crea una publicación con texto, imágenes (subida real) y ubicación opcional. */
export async function createPost(formData: FormData): Promise<void> {
  const user = await requireUser();

  const content = String(formData.get("content") ?? "").trim().slice(0, 3000);
  const kindRaw = String(formData.get("kind") ?? "GENERAL");
  const kind = POST_KIND_VALUES.includes(kindRaw) ? kindRaw : "GENERAL";

  const images: string[] = [];
  for (const entry of formData.getAll("images")) {
    if (entry instanceof File && entry.size > 0 && images.length < MAX_IMAGES) {
      const url = await trySaveImage(entry);
      if (url) images.push(url);
    }
  }

  if (!content && images.length === 0) redirect("/feed?error=vacio");

  const lat = parseFloat(String(formData.get("lat") ?? ""));
  const lng = parseFloat(String(formData.get("lng") ?? ""));

  await db.post.create({
    data: {
      authorId: user.id,
      content,
      kind,
      images: JSON.stringify(images),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      locationLabel: String(formData.get("locationLabel") ?? "").trim().slice(0, 120),
    },
  });

  revalidatePath("/feed");
  redirect("/feed?ok=1");
}

export async function toggleLike(postId: string): Promise<void> {
  const user = await requireUser();
  const existing = await db.postLike.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
  });
  if (existing) {
    await db.postLike.delete({ where: { id: existing.id } });
  } else {
    await db.postLike.create({ data: { postId, userId: user.id } });
  }
  revalidatePath("/feed");
  revalidatePath(`/feed/${postId}`);
}

export async function toggleSave(postId: string): Promise<void> {
  const user = await requireUser();
  const existing = await db.postSave.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
  });
  if (existing) {
    await db.postSave.delete({ where: { id: existing.id } });
  } else {
    await db.postSave.create({ data: { postId, userId: user.id } });
  }
  revalidatePath("/feed");
  revalidatePath("/feed/saved");
  revalidatePath(`/feed/${postId}`);
}

/** Compartir: incrementa el contador (el link se copia en el cliente). */
export async function sharePost(postId: string): Promise<void> {
  await requireUser();
  await db.post.update({ where: { id: postId }, data: { shareCount: { increment: 1 } } });
  revalidatePath("/feed");
  revalidatePath(`/feed/${postId}`);
}

export async function addComment(postId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const content = String(formData.get("content") ?? "").trim().slice(0, 1000);
  if (!content) return;
  await db.postComment.create({ data: { postId, authorId: user.id, content } });
  revalidatePath(`/feed/${postId}`);
  revalidatePath("/feed");
}

/** Elimina una publicación (su autor, o un admin). */
export async function deletePost(postId: string): Promise<void> {
  const user = await requireUser();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) return;
  if (post.authorId !== user.id && user.role !== "ADMIN") return;
  await db.post.delete({ where: { id: postId } });
  revalidatePath("/feed");
  revalidatePath("/admin/posts");
}

/** Umbral de denuncias distintas que oculta automáticamente una publicación
 *  hasta que un admin la revise. */
const AUTO_HIDE_THRESHOLD = 3;

/** Denuncia de una publicación (cualquier usuario). */
export async function reportPost(postId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const reason = String(formData.get("reason") ?? "").trim() || "Contenido inapropiado";
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId === user.id) return;

  // Una denuncia por usuario y publicación.
  const already = await db.postReport.findFirst({ where: { postId, reporterId: user.id } });
  if (already) return;

  await db.postReport.create({ data: { postId, reporterId: user.id, reason } });

  // Moderación proactiva: si acumula muchas denuncias abiertas, se oculta sola.
  if (!post.hidden) {
    const openReports = await db.postReport.count({ where: { postId, status: "OPEN" } });
    if (openReports >= AUTO_HIDE_THRESHOLD) {
      await db.post.update({ where: { id: postId }, data: { hidden: true } });
      revalidatePath("/feed");
    }
  }
  revalidatePath(`/feed/${postId}`);
  revalidatePath("/admin/posts");
}
