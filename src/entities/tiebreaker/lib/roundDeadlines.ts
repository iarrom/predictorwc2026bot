import type { TiebreakerRoundKey } from "@/entities/tiebreaker/model/types";

interface MatchKickoff {
  round_key: string;
  kickoff_at: string;
}

export function matchBelongsToTiebreakerRound(
  matchRoundKey: string,
  tiebreakerRoundKey: TiebreakerRoundKey,
): boolean {
  if (tiebreakerRoundKey === "playoff") {
    return !matchRoundKey.startsWith("group_");
  }

  return matchRoundKey === tiebreakerRoundKey;
}

export function getTiebreakerRoundMatches(
  matches: MatchKickoff[],
  tiebreakerRoundKey: TiebreakerRoundKey,
): MatchKickoff[] {
  return matches.filter((match) =>
    matchBelongsToTiebreakerRound(match.round_key, tiebreakerRoundKey),
  );
}

export function getTiebreakerRoundMatchCount(
  matches: MatchKickoff[],
  tiebreakerRoundKey: TiebreakerRoundKey,
): number {
  return getTiebreakerRoundMatches(matches, tiebreakerRoundKey).length;
}

export function getTiebreakerRoundDeadline(
  matches: MatchKickoff[],
  tiebreakerRoundKey: TiebreakerRoundKey,
): string | null {
  const roundMatches = getTiebreakerRoundMatches(matches, tiebreakerRoundKey);

  if (roundMatches.length === 0) {
    return null;
  }

  return roundMatches.reduce((earliest, match) => {
    if (!earliest || match.kickoff_at < earliest) {
      return match.kickoff_at;
    }

    return earliest;
  }, roundMatches[0]!.kickoff_at);
}

export function isTiebreakerRoundLocked(
  deadlineAt: string | null,
  now = new Date(),
): boolean {
  if (!deadlineAt) {
    return true;
  }

  return new Date(deadlineAt) <= now;
}
