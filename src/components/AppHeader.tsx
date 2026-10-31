import Link from "next/link";
import { Bell, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { Brand } from "@/components/Brand";

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
export async function AppHeader({ userId }: { userId: string }) {
  const [unreadMessages, unreadNotifications] = await Promise.all([
    db.message.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: { OR: [{ aId: userId }, { bId: userId }] },
      },
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);

  const iconLink = "relative flex items-center justify-center w-10 h-10 rounded-full text-muted hover:text-fg hover:bg-surface-2 transition";

  return (
    <header className="sticky top-0 z-[1100] bg-surface/85 backdrop-blur-lg border-b border-line">
      <div className="mx-auto max-w-5xl h-14 px-4 flex items-center justify-between gap-3">
        <Brand href="/app" size="sm" />
        <nav className="flex items-center gap-1" aria-label="Accesos rápidos">
          <Link
            href="/chat"
            className={iconLink}
            aria-label={unreadMessages > 0 ? `Mensajes (${unreadMessages} sin leer)` : "Mensajes"}
          >
            <MessageCircle className="w-[22px] h-[22px]" aria-hidden />
            <CountBadge n={unreadMessages} />
          </Link>
          <Link
            href="/notificaciones"
            className={iconLink}
            aria-label={unreadNotifications > 0 ? `Notificaciones (${unreadNotifications} sin leer)` : "Notificaciones"}
          >
            <Bell className="w-[22px] h-[22px]" aria-hidden />
            <CountBadge n={unreadNotifications} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
