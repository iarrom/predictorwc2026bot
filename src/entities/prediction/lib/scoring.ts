import { isKnockoutRound } from "@/entities/match/lib/isKnockoutRound";
import type { PredictionOutcome } from "@/entities/prediction/model/types";

export function outcomeFromScore(
  homeScore: number,
  awayScore: number,
): PredictionOutcome {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export interface MatchForScoring {
  round_key: string;
  home_score: number | null;
  away_score: number | null;
  winner: PredictionOutcome | null;
}

const POINTS_BY_ROUND: Record<string, number> = {
  group_1: 1,
  group_2: 1,
  group_3: 1,
  round_of_32: 2,
  round_of_16: 3,
  quarter_final: 4,
  semi_final: 5,
  final: 6,
  third_place: 0,
};

/** Points awarded for a correct pick in the given tournament round. */
export function pointsForRound(roundKey: string): number {
  return POINTS_BY_ROUND[roundKey] ?? 1;
}

/** Outcome used for final scoring (knockout uses advancing team when winner is set). */
export function resolveScoredOutcome(
  match: MatchForScoring,
): PredictionOutcome | null {
  if (match.home_score === null || match.away_score === null) {
    return null;
  }

  if (isKnockoutRound(match.round_key)) {
    if (match.winner) {
      return match.winner;
    }

    const scoreOutcome = outcomeFromScore(match.home_score, match.away_score);

    // A drawn knockout score means the advancing team is decided by a
    // penalty shootout; until `winner` is synced the outcome is unknown
    // (picking "draw" is impossible in knockout rounds).
    return scoreOutcome === "draw" ? null : scoreOutcome;
  }

  return outcomeFromScore(match.home_score, match.away_score);
}

export function scorePrediction(
  predicted: PredictionOutcome,
  match: MatchForScoring,
): number {
  const actual = resolveScoredOutcome(match);
  if (!actual) return 0;
  return predicted === actual ? pointsForRound(match.round_key) : 0;
}

/** Live projection from current full-time score (winner unknown until match ends). */
export function projectPredictionPoints(
  predicted: PredictionOutcome,
  homeScore: number,
  awayScore: number,
  roundKey: string,
): number {
  return predicted === outcomeFromScore(homeScore, awayScore)
    ? pointsForRound(roundKey)
    : 0;
}
