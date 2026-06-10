import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";

interface MatchVotersProps {
  voters: MatchVoterInfo;
  compact?: boolean;
}

export function MatchVoters({ voters, compact }: MatchVotersProps) {
  if (voters.count === 0) return null;

  return (
    <span
      className={
        compact
          ? "text-[10px] text-muted-foreground"
          : "text-[11px] text-muted-foreground"
      }
    >
      {voters.count} voted
    </span>
  );
}
