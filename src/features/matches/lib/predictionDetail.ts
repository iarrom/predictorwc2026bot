import type { PredictionOutcome } from "@/entities/prediction/model/types";

export interface PredictionDetail {
  round_key: string;
  outcome: PredictionOutcome;
  points_awarded: number | null;
}

export function toPredictionFormInitial(
  prediction: PredictionDetail,
): { outcome: PredictionOutcome } {
  return { outcome: prediction.outcome };
}
