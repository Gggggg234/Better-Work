import { BadgeCheck, Sparkles, Megaphone, Trophy } from "lucide-react";

export function RankBadge({ rank }: { rank: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg">
      <Trophy className="w-3 h-3 text-gold" aria-hidden />
      {rank}
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-accent-2/12 px-2 py-0.5 text-[11px] font-bold text-accent-2"
      title="Identidad verificada por Better Work"
    >
      <BadgeCheck className="w-3.5 h-3.5" aria-hidden />
      Verificado
    </span>
  );
}

/** Better Work Pro (suscripción del profesional). */
export function ProBadge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white"
      title="Profesional con Better Work Pro"
    >
      <Sparkles className="w-3 h-3" aria-hidden />
      PRO
    </span>
  );
}

export function SponsoredBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold/12 px-2 py-0.5 text-[11px] font-bold text-gold">
      <Megaphone className="w-3 h-3" aria-hidden />
      Destacado
    </span>
  );
}
