import Link from "next/link";
import { Star, MapPin, ChevronRight } from "lucide-react";
import { Avatar } from "./Avatar";
import { RankBadge, VerifiedBadge, SponsoredBadge, ProBadge } from "./Badges";
import { formatKm } from "@/lib/geo";

export type WorkerCardData = {
  userId: string;
  rank: string;
  name: string;
  avatarUrl?: string | null;
  profession: string;
  zone?: string;
  city?: string;
  ratingAvg: number;
  ratingCount: number;
  jobsDone: number;
  cancellations?: number;
  verified: boolean;
  sponsored?: boolean;
  pro?: boolean;
  distanceKm?: number | null;
  priceHint?: string | null;
};

export function WorkerCard({ w }: { w: WorkerCardData }) {
  const where = [typeof w.distanceKm === "number" ? formatKm(w.distanceKm) : null, w.zone || w.city].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/w/${w.userId}`}
      className={`card card-hover flex items-center gap-3.5 p-3.5 pr-3 ${w.sponsored ? "!border-gold/40" : ""}`}
    >
      <div className="relative shrink-0">
        <Avatar name={w.name} url={w.avatarUrl} size={58} className="!rounded-2xl" />
        {w.ratingCount > 0 && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 rounded-full bg-surface px-1.5 py-px text-[10px] font-extrabold shadow-soft border border-line">
            <Star className="w-2.5 h-2.5 fill-gold text-gold" aria-hidden />
            {w.ratingAvg.toFixed(1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-[15px] truncate">{w.name}</p>
          {w.pro && <ProBadge />}
        </div>
        <p className="text-sm text-muted truncate">{w.profession}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {w.verified && <VerifiedBadge />}
          {w.sponsored && <SponsoredBadge />}
          <RankBadge rank={w.rank} />
          <span className="text-[11px] font-semibold text-faint">
            {w.jobsDone} {w.jobsDone === 1 ? "trabajo" : "trabajos"}
            {w.ratingCount > 0 && ` · ${w.ratingCount} reseñas`}
          </span>
        </div>
        {where && (
          <p className="text-[11px] text-faint mt-1 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" aria-hidden />
            {where}
            {w.priceHint && <span className="text-muted font-semibold"> · {w.priceHint}</span>}
          </p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-faint shrink-0" aria-hidden />
    </Link>
  );
}
