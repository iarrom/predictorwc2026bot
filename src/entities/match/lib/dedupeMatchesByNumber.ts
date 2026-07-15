import type { Match } from "@/entities/match/model/types";

function canonicalExternalKey(matchNumber: number): string {
  return `wc2026-${matchNumber}`;
}

function matchRank(match: Match): number {
  if (match.match_number == null) return 2;

  if (match.external_key === canonicalExternalKey(match.match_number)) {
    return 0;
  }

  return 1;
}

function pickPreferredMatch(current: Match, candidate: Match): Match {
  const currentRank = matchRank(current);
  const candidateRank = matchRank(candidate);

  if (candidateRank !== currentRank) {
    return candidateRank < currentRank ? candidate : current;
  }

  const currentUpdated = current.updated_at ?? "";
  const candidateUpdated = candidate.updated_at ?? "";

  if (candidateUpdated !== currentUpdated) {
    return candidateUpdated > currentUpdated ? candidate : current;
  }

  return candidate.id > current.id ? candidate : current;
}

export function dedupeMatchesByNumber(matches: Match[]): Match[] {
  const byNumber = new Map<number, Match>();
  const withoutNumber: Match[] = [];

  for (const match of matches) {
    if (match.match_number == null) {
      withoutNumber.push(match);
      continue;
    }

    const existing = byNumber.get(match.match_number);
    byNumber.set(
      match.match_number,
      existing ? pickPreferredMatch(existing, match) : match,
    );
  }

  const dedupedNumbers = [...byNumber.values()];
  const seenRoundKeys = new Set(
    dedupedNumbers
      .filter((match) => match.round_key === "final" || match.round_key === "third_place")
      .map((match) => match.round_key),
  );

  const filteredWithoutNumber = withoutNumber.filter((match) => {
    if (match.round_key !== "final" && match.round_key !== "third_place") {
      return true;
    }

    return !seenRoundKeys.has(match.round_key);
  });

  return [...dedupedNumbers, ...filteredWithoutNumber].sort((a, b) =>
    a.kickoff_at.localeCompare(b.kickoff_at),
  );
}
