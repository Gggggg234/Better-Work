import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function authorize(conversationId: string) {
  const session = await getSession();
  if (!session) return null;
  const conv = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conv || (conv.aId !== session.userId && conv.bId !== session.userId)) return null;
  return { session, conv };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Marcar como leídos los mensajes del otro.
  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: auth.session.userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const type = String(body.type ?? "TEXT");
  const content = String(body.content ?? "").slice(0, 4000);
  const meta = typeof body.meta === "object" && body.meta ? body.meta : {};

  if (type === "TEXT" && !content.trim()) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  const message = await db.message.create({
    data: {
      conversationId: id,
      senderId: auth.session.userId,
      type,
      content,
      meta: JSON.stringify(meta),
    },
  });
  await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ message });
}
