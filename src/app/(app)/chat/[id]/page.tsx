import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { ChatThread } from "@/components/ChatThread";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const conv = await db.conversation.findUnique({
    where: { id },
    include: { a: true, b: true },
  });
  if (!conv || (conv.aId !== me.id && conv.bId !== me.id)) notFound();
  const other = conv.aId === me.id ? conv.b : conv.a;

  return (
    <main className="max-w-lg mx-auto w-full flex flex-col h-[calc(100vh-60px)]">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-line bg-bg sticky top-0 z-10">
        <Link href="/chat" className="text-lg px-1" aria-label="Volver">←</Link>
        <Avatar name={other.name} url={other.avatarUrl} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{other.name}</p>
          <p className="text-[11px] text-faint">{other.role === "WORKER" ? "Trabajador" : other.role === "COMPANY" ? "Empresa" : "Cliente"}</p>
        </div>
        {other.role === "WORKER" && (
          <Link href={`/w/${other.id}`} className="btn-secondary !py-1.5 !px-3 !text-xs">Ver perfil</Link>
        )}
      </header>
      <div className="flex-1 min-h-0">
        <ChatThread conversationId={conv.id} meId={me.id} />
      </div>
    </main>
  );
}
