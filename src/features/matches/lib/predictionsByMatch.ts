import type { PredictionOutcome } from "@/entities/prediction/model/types";

export interface MatchPredictionEntry {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  outcome: PredictionOutcome;
  points_awarded: number | null;
}

export function buildPredictionsByMatch(
  predictions: {
    match_id: string;
    user_id: string;
    outcome: PredictionOutcome;
    points_awarded: number | null;
  }[],
  profiles: { id: string; display_name: string; photo_url?: string | null }[],
): Record<string, MatchPredictionEntry[]> {
  const profileMap = new Map(
    profiles.map((p) => [
      p.id,
      { name: p.display_name, photoUrl: p.photo_url ?? null },
    ]),
  );
  const result: Record<string, MatchPredictionEntry[]> = {};

  for (const prediction of predictions) {
    const profile = profileMap.get(prediction.user_id);
    const entry: MatchPredictionEntry = {
      user_id: prediction.user_id,
      display_name: profile?.name ?? "Unknown player",
      photo_url: profile?.photoUrl ?? null,
      outcome: prediction.outcome,
      points_awarded: prediction.points_awarded,
    };

    if (!result[prediction.match_id]) {
      result[prediction.match_id] = [];
    }
    result[prediction.match_id].push(entry);
  }

  return result;
}
