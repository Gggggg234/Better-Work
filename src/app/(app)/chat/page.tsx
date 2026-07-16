import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/format";

export default async function ChatListPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const conversations = await db.conversation.findMany({
    where: { OR: [{ aId: me.id }, { bId: me.id }] },
    include: {
      a: true,
      b: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <h1 className="text-2xl font-bold">Mensajes</h1>
      <div className="space-y-2 mt-5">
        {conversations.map((c) => {
          const other = c.aId === me.id ? c.b : c.a;
          const last = c.messages[0];
          const unread = last && last.senderId !== me.id && !last.readAt;
          const preview =
            last?.type === "TEXT"
              ? last.content
              : last?.type === "IMAGE"
                ? "🖼 Imagen"
                : last?.type === "LOCATION"
                  ? "📍 Ubicación"
                  : last?.type === "BUDGET"
                    ? "💰 Presupuesto"
                    : last?.type === "FILE"
                      ? "📎 Archivo"
                      : "Nueva conversación";
          return (
            <Link key={c.id} href={`/chat/${c.id}`} className="card p-4 flex items-center gap-3.5 hover:shadow-md transition">
              <Avatar name={other.name} url={other.avatarUrl} size={46} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${unread ? "font-bold" : "font-semibold"}`}>{other.name}</p>
                  {last && <span className="text-[11px] text-faint shrink-0">{timeAgo(last.createdAt)}</span>}
                </div>
                <p className={`text-sm truncate ${unread ? "text-fg font-medium" : "text-muted"}`}>{preview}</p>
              </div>
              {unread && <span className="w-2.5 h-2.5 rounded-full bg-fg shrink-0" />}
            </Link>
          );
        })}
        {conversations.length === 0 && (
          <div className="card p-8 text-center text-sm text-faint">
            No tenés conversaciones todavía. Entrá al perfil de un trabajador y tocá “Mensaje”.
          </div>
        )}
      </div>
    </main>
  );
}
