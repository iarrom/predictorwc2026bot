import { projectPredictionPoints } from "@/entities/prediction/lib/scoring";
import type { PredictionOutcome } from "@/entities/prediction/model/types";

export function isPredictionOnTrack(
  predicted: PredictionOutcome,
  homeScore: number,
  awayScore: number,
): boolean {
  return projectPredictionPoints(predicted, homeScore, awayScore) === 1;
}

/** Green when the current score matches the pick; soft red otherwise. */
export function livePredictionTextClass(
  live: boolean,
  predicted: PredictionOutcome,
  homeScore: number,
  awayScore: number,
): string | undefined {
  if (!live) return undefined;

  return isPredictionOnTrack(predicted, homeScore, awayScore)
    ? "text-emerald-300"
    : "text-red-300/80";
}
