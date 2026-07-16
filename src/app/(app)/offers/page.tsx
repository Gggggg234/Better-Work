import Link from "next/link";
import { db } from "@/lib/db";
import { SponsoredBadge } from "@/components/Badges";
import { timeAgo } from "@/lib/format";

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const sp = await searchParams;
  const now = new Date();

  const offers = await db.jobOffer.findMany({
    where: {
      active: true,
      // Solo ofertas de empresas con plan Premium activo.
      company: { user: { suspended: false }, planActiveUntil: { gt: now } },
      ...(sp.company ? { companyId: sp.company } : {}),
    },
    include: { company: true, category: true },
    orderBy: [{ promotedUntil: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  const sorted = [...offers].sort((a, b) => {
    const pa = a.promotedUntil && a.promotedUntil > now ? 1 : 0;
    const pb = b.promotedUntil && b.promotedUntil > now ? 1 : 0;
    return pb - pa;
  });

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6">
      <h1 className="text-2xl font-bold">Ofertas de empleo</h1>
      <p className="text-sm text-muted mt-1">Empresas que buscan profesionales como vos.</p>

      <div className="space-y-2.5 mt-5">
        {sorted.map((o) => (
          <Link key={o.id} href={`/offers/${o.id}`} className="card p-4 block hover:shadow-md transition">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{o.title}</p>
              {o.promotedUntil && o.promotedUntil > now && <SponsoredBadge />}
            </div>
            <p className="text-sm text-muted mt-0.5">
              {o.company.companyName} · {o.city} · {o.modality}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium">{o.salary ?? "Salario a convenir"}</span>
              <span className="text-[11px] text-faint">{timeAgo(o.createdAt)}</span>
            </div>
          </Link>
        ))}
        {sorted.length === 0 && (
          <div className="card p-8 text-center text-sm text-faint">No hay ofertas publicadas por ahora.</div>
        )}
      </div>
    </main>
  );
}
