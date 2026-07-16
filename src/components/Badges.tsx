export function RankBadge({ rank }: { rank: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg">
      {rank}
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-fg px-2.5 py-0.5 text-xs font-medium text-bg"
      title="Identidad verificada por Better Work"
    >
      ✓ Verificado
    </span>
  );
}

export function SponsoredBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
      Patrocinado
    </span>
  );
}
