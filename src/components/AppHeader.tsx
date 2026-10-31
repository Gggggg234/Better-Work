import Link from "next/link";
import { Bell, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { Brand } from "@/components/Brand";
import { Avatar } from "@/components/Avatar";

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-surface">
      {n > 9 ? "9+" : n}
    </span>
  );
}

/**
 * Barra superior de la app: marca + accesos a mensajes y notificaciones con
 * contador de no leídos, siempre visibles en cualquier pantalla.
 */
export async function AppHeader({ user }: { user: { id: string; name: string; avatarUrl: string | null } }) {
  const [unreadMessages, unreadNotifications] = await Promise.all([
    db.message.count({
      where: {
        readAt: null,
        senderId: { not: user.id },
        conversation: { OR: [{ aId: user.id }, { bId: user.id }] },
      },
    }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const iconLink =
    "relative flex items-center justify-center w-10 h-10 rounded-full text-fg/80 hover:text-fg bg-surface-2/70 hover:bg-surface-2 transition";

  return (
    <header className="sticky top-0 z-[1100] glass border-b border-line/60 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-5xl h-[60px] px-4 flex items-center justify-between gap-3">
        <Brand href="/app" size="sm" />
        <nav className="flex items-center gap-2" aria-label="Accesos rápidos">
          <Link
            href="/chat"
            className={iconLink}
            aria-label={unreadMessages > 0 ? `Mensajes (${unreadMessages} sin leer)` : "Mensajes"}
          >
            <MessageCircle className="w-5 h-5" aria-hidden />
            <CountBadge n={unreadMessages} />
          </Link>
          <Link
            href="/notificaciones"
            className={iconLink}
            aria-label={unreadNotifications > 0 ? `Notificaciones (${unreadNotifications} sin leer)` : "Notificaciones"}
          >
            <Bell className="w-5 h-5" aria-hidden />
            <CountBadge n={unreadNotifications} />
          </Link>
          <Link href="/profile" aria-label="Mi perfil" className="ml-0.5 rounded-full hover:opacity-90 transition">
            <Avatar name={user.name} url={user.avatarUrl} size={38} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
