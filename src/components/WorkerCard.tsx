import Link from "next/link";
import { Avatar } from "./Avatar";
import { Stars } from "./Stars";
import { RankBadge, VerifiedBadge, SponsoredBadge } from "./Badges";
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
  distanceKm?: number | null;
  priceHint?: string | null;
};

export function WorkerCard({ w }: { w: WorkerCardData }) {
  return (
    <Link
      href={`/w/${w.userId}`}
      className="card flex items-center gap-3.5 p-4 hover:shadow-md hover:-translate-y-px transition-all duration-200"
    >
      <Avatar name={w.name} url={w.avatarUrl} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">{w.name}</p>
          {w.verified && <VerifiedBadge />}
          {w.sponsored && <SponsoredBadge />}
        </div>
        <p className="text-sm text-muted truncate">{w.profession}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted flex-wrap">
          <Stars value={w.ratingAvg} size="text-xs" />
          <span>
            {w.ratingAvg.toFixed(1)} ({w.ratingCount})
          </span>
          <span>·</span>
          <span>{w.jobsDone} trabajos</span>
          <RankBadge rank={w.rank} />
        </div>
      </div>
      <div className="text-right shrink-0">
        {typeof w.distanceKm === "number" && (
          <p className="text-sm font-semibold">{formatKm(w.distanceKm)}</p>
        )}
        {w.zone && <p className="text-xs text-faint">{w.zone}</p>}
      </div>
    </Link>
  );
}
