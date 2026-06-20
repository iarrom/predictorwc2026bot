import { matchBelongsToTiebreakerRound } from "@/entities/tiebreaker/lib/roundDeadlines";
import {
  TIEBREAKER_ROUND_KEYS,
  type TiebreakerRoundKey,
} from "@/entities/tiebreaker/model/types";

export interface MatchForStandings {
  round_key: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

export interface DecryptedTiebreakerEntry {
  user_id: string;
  round_key: TiebreakerRoundKey;
  goals: number;
}

export interface TiebreakerProfile {
  id: string;
  display_name: string;
  photo_url: string | null;
}

export interface TiebreakerRoundCell {
  prediction: number | null;
  deviation: number;
}

export interface TiebreakerStandingRow {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  perRound: Record<TiebreakerRoundKey, TiebreakerRoundCell | null>;
  overall: number | null;
}

export interface TiebreakerStandingsResult {
  revealedRounds: Record<TiebreakerRoundKey, boolean>;
  actualGoalsByRound: Record<TiebreakerRoundKey, number | null>;
  rows: TiebreakerStandingRow[];
}

function getRoundMatches(
  matches: MatchForStandings[],
  tiebreakerRoundKey: TiebreakerRoundKey,
): MatchForStandings[] {
  return matches.filter((match) =>
    matchBelongsToTiebreakerRound(match.round_key, tiebreakerRoundKey),
  );
}

export function isRoundComplete(
  matches: MatchForStandings[],
  tiebreakerRoundKey: TiebreakerRoundKey,
): boolean {
  const roundMatches = getRoundMatches(matches, tiebreakerRoundKey);

  if (roundMatches.length === 0) {
    return false;
  }

  return roundMatches.every(
    (match) =>
      match.status === "finished" &&
      match.home_score !== null &&
      match.away_score !== null,
  );
}

export function getActualRoundGoals(
  matches: MatchForStandings[],
  tiebreakerRoundKey: TiebreakerRoundKey,
): number {
  return getRoundMatches(matches, tiebreakerRoundKey)
    .filter(
      (match) =>
        match.status === "finished" &&
        match.home_score !== null &&
        match.away_score !== null,
    )
    .reduce((sum, match) => sum + match.home_score! + match.away_score!, 0);
}

function getRevealedRounds(
  matches: MatchForStandings[],
): Record<TiebreakerRoundKey, boolean> {
  return Object.fromEntries(
    TIEBREAKER_ROUND_KEYS.map((roundKey) => [
      roundKey,
      isRoundComplete(matches, roundKey),
    ]),
  ) as Record<TiebreakerRoundKey, boolean>;
}

function getWorstDeviationByRound({
  revealedRounds,
  actualGoalsByRound,
  decryptedRows,
}: {
  revealedRounds: Record<TiebreakerRoundKey, boolean>;
  actualGoalsByRound: Record<TiebreakerRoundKey, number | null>;
  decryptedRows: DecryptedTiebreakerEntry[];
}): Record<TiebreakerRoundKey, number> {
  const worstDeviationByRound = Object.fromEntries(
    TIEBREAKER_ROUND_KEYS.map((roundKey) => [roundKey, 0]),
  ) as Record<TiebreakerRoundKey, number>;

  for (const roundKey of TIEBREAKER_ROUND_KEYS) {
    if (!revealedRounds[roundKey]) {
      continue;
    }

    const actual = actualGoalsByRound[roundKey]!;

    for (const row of decryptedRows) {
      if (row.round_key !== roundKey) {
        continue;
      }

      const deviation = Math.abs(row.goals - actual);
      if (deviation > worstDeviationByRound[roundKey]) {
        worstDeviationByRound[roundKey] = deviation;
      }
    }
  }

  return worstDeviationByRound;
}

export function buildTiebreakerStandings({
  matches,
  decryptedRows,
  profiles,
}: {
  matches: MatchForStandings[];
  decryptedRows: DecryptedTiebreakerEntry[];
  profiles: TiebreakerProfile[];
  now?: Date;
}): TiebreakerStandingsResult {
  const revealedRounds = getRevealedRounds(matches);

  const actualGoalsByRound = Object.fromEntries(
    TIEBREAKER_ROUND_KEYS.map((roundKey) => [
      roundKey,
      revealedRounds[roundKey]
        ? getActualRoundGoals(matches, roundKey)
        : null,
    ]),
  ) as Record<TiebreakerRoundKey, number | null>;

  const worstDeviationByRound = getWorstDeviationByRound({
    revealedRounds,
    actualGoalsByRound,
    decryptedRows,
  });

  const predictionsByUser = new Map<string, Map<TiebreakerRoundKey, number>>();

  for (const row of decryptedRows) {
    let userPredictions = predictionsByUser.get(row.user_id);

    if (!userPredictions) {
      userPredictions = new Map();
      predictionsByUser.set(row.user_id, userPredictions);
    }

    userPredictions.set(row.round_key, row.goals);
  }

  const rows: TiebreakerStandingRow[] = profiles.map((profile) => {
    const userPredictions = predictionsByUser.get(profile.id);
    const perRound = Object.fromEntries(
      TIEBREAKER_ROUND_KEYS.map((roundKey) => {
        if (!revealedRounds[roundKey]) {
          return [roundKey, null];
        }

        const actual = actualGoalsByRound[roundKey]!;
        const prediction = userPredictions?.get(roundKey);

        if (prediction === undefined) {
          return [
            roundKey,
            {
              prediction: null,
              deviation: worstDeviationByRound[roundKey],
            },
          ];
        }

        return [
          roundKey,
          {
            prediction,
            deviation: Math.abs(prediction - actual),
          },
        ];
      }),
    ) as Record<TiebreakerRoundKey, TiebreakerRoundCell | null>;

    const deviations = TIEBREAKER_ROUND_KEYS.map(
      (roundKey) => perRound[roundKey]?.deviation,
    ).filter((value): value is number => value !== undefined);

    const overall =
      deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) : null;

    return {
      userId: profile.id,
      displayName: profile.display_name,
      photoUrl: profile.photo_url,
      perRound,
      overall,
    };
  });

  rows.sort((left, right) => {
    if (left.overall === null && right.overall === null) {
      return left.displayName.localeCompare(right.displayName);
    }

    if (left.overall === null) {
      return 1;
    }

    if (right.overall === null) {
      return -1;
    }

    if (left.overall !== right.overall) {
      return left.overall - right.overall;
    }

    return left.displayName.localeCompare(right.displayName);
  });

  return {
    revealedRounds,
    actualGoalsByRound,
    rows,
  };
}
