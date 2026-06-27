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

/** Outcome used for final scoring (knockout uses advancing team when winner is set). */
export function resolveScoredOutcome(
  match: MatchForScoring,
): PredictionOutcome | null {
  if (match.home_score === null || match.away_score === null) {
    return null;
  }

  if (isKnockoutRound(match.round_key) && match.winner) {
    return match.winner;
  }

  return outcomeFromScore(match.home_score, match.away_score);
}

/** One point for a correct pick. */
export function scorePrediction(
  predicted: PredictionOutcome,
  match: MatchForScoring,
): number {
  const actual = resolveScoredOutcome(match);
  if (!actual) return 0;
  return predicted === actual ? 1 : 0;
}

/** Live projection from current full-time score (winner unknown until match ends). */
export function projectPredictionPoints(
  predicted: PredictionOutcome,
  homeScore: number,
  awayScore: number,
): number {
  return predicted === outcomeFromScore(homeScore, awayScore) ? 1 : 0;
}
