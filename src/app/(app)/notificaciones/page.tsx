import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { vapidPublicKey } from "@/lib/notify";
import { after } from "next/server";
import { PushToggle } from "@/components/PushToggle";
import { BackButton } from "@/components/BackButton";

export default async function NotificationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [items, publicKey] = await Promise.all([
    db.notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    vapidPublicKey(),
  ]);
  // Abrir el centro las marca como leídas, pero recién después de mostrarlas:
  // en esta vista todavía se ve cuáles eran nuevas.
  if (items.some((n) => !n.readAt)) {
    after(() => db.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } }));
  }

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 space-y-5 animate-fade-up">
      <div>
        <BackButton fallback="/app" />
        <h1 className="text-2xl font-bold">Notificaciones</h1>
      </div>

      <PushToggle publicKey={publicKey} />

      <div className="card divide-y divide-line">
        {items.map((n) => (
          <Link key={n.id} href={n.url} className="p-4 flex gap-3 hover:bg-surface-2 transition">
            <span
              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.readAt ? "bg-transparent" : "bg-fg"}`}
              aria-label={n.readAt ? undefined : "Sin leer"}
            />
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${n.readAt ? "text-muted" : "font-semibold"}`}>{n.title}</p>
              {n.body && <p className="text-xs text-muted mt-0.5">{n.body}</p>}
              <p className="text-[11px] text-faint mt-1">{timeAgo(n.createdAt)}</p>
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="p-6 text-center text-sm text-faint">
            Todavía no tenés notificaciones. Acá vas a ver pedidos, presupuestos y novedades de tus trabajos.
          </p>
        )}
      </div>
    </main>
  );
}
