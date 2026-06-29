import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { decryptOutcome } from "./predictions-crypto.ts";
import {
  type MatchForScoring,
  scorePrediction,
} from "./scoring.ts";

interface PredictionRow {
  id: string;
  user_id: string;
  match_id: string;
  outcome_encrypted: string;
}

export async function awardPredictionPoints(
  supabase: SupabaseClient,
  matchId: string,
  match: MatchForScoring,
  encryptionKey: Uint8Array,
): Promise<number> {
  if (match.home_score === null || match.away_score === null) {
    return 0;
  }

  const { data: predictions, error } = await supabase
    .from("predictions")
    .select("id, user_id, match_id, outcome_encrypted")
    .eq("match_id", matchId);

  if (error) {
    console.error("Failed to load predictions for scoring", matchId, error);
    return 0;
  }

  if (!predictions?.length) {
    return 0;
  }

  let awarded = 0;

  for (const row of predictions as PredictionRow[]) {
    try {
      const outcome = await decryptOutcome(
        row.outcome_encrypted,
        { userId: row.user_id, matchId: row.match_id },
        encryptionKey,
      );
      const points = scorePrediction(outcome, match);

      const { error: updateError } = await supabase
        .from("predictions")
        .update({ points_awarded: points })
        .eq("id", row.id);

      if (updateError) {
        console.error("Failed to update points_awarded", row.id, updateError);
        continue;
      }

      awarded += 1;
    } catch (awardError) {
      console.error("Failed to award prediction points", row.id, awardError);
    }
  }

  return awarded;
}
