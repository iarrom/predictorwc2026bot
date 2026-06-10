import type { PredictionOutcome } from "@/entities/prediction/model/types";

export function outcomeFromScore(
  homeScore: number,
  awayScore: number,
): PredictionOutcome {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

/** One point for a correct outcome pick (group stage). */
export function projectPredictionPoints(
  predicted: PredictionOutcome,
  homeScore: number,
  awayScore: number,
): number {
  return predicted === outcomeFromScore(homeScore, awayScore) ? 1 : 0;
}
