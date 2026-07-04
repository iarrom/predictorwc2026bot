import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import {
  resolveScoredOutcome,
  scorePrediction,
} from "../src/entities/prediction/lib/scoring";
import { decryptOutcome } from "../src/shared/lib/predictions-crypto-core";
import type { PredictionOutcome } from "../src/entities/prediction/model/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
  );
}

if (!process.env.PREDICTIONS_ENCRYPTION_KEY) {
  throw new Error("PREDICTIONS_ENCRYPTION_KEY is required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, round_key, status, home_score, away_score, winner")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  if (matchesError) {
    throw new Error(`Failed to load matches: ${matchesError.message}`);
  }

  if (!matches?.length) {
    console.log("No finished matches to score.");
    return;
  }

  let updated = 0;

  for (const match of matches) {
    const resolvedOutcome = resolveScoredOutcome({
      round_key: match.round_key,
      home_score: match.home_score,
      away_score: match.away_score,
      winner: match.winner as PredictionOutcome | null,
    });

    // Knockout draw without a synced shootout winner: outcome unknown yet.
    if (resolvedOutcome === null) continue;

    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("id, user_id, match_id, outcome_encrypted")
      .eq("match_id", match.id);

    if (predictionsError) {
      throw new Error(
        `Failed to load predictions for match ${match.id}: ${predictionsError.message}`,
      );
    }

    if (!predictions?.length) continue;

    for (const prediction of predictions) {
      const outcome = decryptOutcome(prediction.outcome_encrypted, {
        userId: prediction.user_id,
        matchId: prediction.match_id,
      });
      const points = scorePrediction(outcome, {
        round_key: match.round_key,
        home_score: match.home_score,
        away_score: match.away_score,
        winner: match.winner as PredictionOutcome | null,
      });

      const { error: updateError } = await supabase
        .from("predictions")
        .update({ points_awarded: points })
        .eq("id", prediction.id);

      if (updateError) {
        throw new Error(
          `Failed to update prediction ${prediction.id}: ${updateError.message}`,
        );
      }

      updated += 1;
    }
  }

  console.log(`Awarded points for ${updated} prediction(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
