"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Busca o crea una conversación con otro usuario y redirige a ella. */
export async function openConversation(otherId: string) {
  const user = await requireUser();
  if (otherId === user.id) redirect("/chat");
  const [aId, bId] = [user.id, otherId].sort();
  const conv = await db.conversation.upsert({
    where: { aId_bId: { aId, bId } },
    create: { aId, bId },
    update: {},
  });
  redirect(`/chat/${conv.id}`);
}

export async function sendMessage(conversationId: string, formData: FormData) {
  const user = await requireUser();
  const conv = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conv || (conv.aId !== user.id && conv.bId !== user.id)) return;

  const type = String(formData.get("type") ?? "TEXT");
  const content = String(formData.get("content") ?? "").trim();
  const meta: Record<string, unknown> = {};

  if (type === "IMAGE" || type === "FILE") {
    meta.url = String(formData.get("url") ?? "").trim();
    meta.filename = String(formData.get("filename") ?? "").trim();
    if (!meta.url) return;
  }
  if (type === "LOCATION") {
    meta.lat = parseFloat(String(formData.get("lat") ?? ""));
    meta.lng = parseFloat(String(formData.get("lng") ?? ""));
  }
  if (type === "BUDGET") {
    meta.amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;
    meta.detail = String(formData.get("detail") ?? "").trim();
  }
  if (type === "TEXT" && !content) return;

  await db.message.create({
    data: { conversationId, senderId: user.id, type, content, meta: JSON.stringify(meta) },
  });
  await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
}
