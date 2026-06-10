export type PredictionOutcome = "home" | "draw" | "away";

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  round_key: string;
  outcome: PredictionOutcome;
  tiebreaker_value: number | null;
  points_awarded: number | null;
  created_at: string;
  updated_at: string;
}
