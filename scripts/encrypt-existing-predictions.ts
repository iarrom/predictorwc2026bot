import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { encryptOutcome } from "../src/shared/lib/predictions-crypto-core";
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
  const { data: rows, error } = await supabase
    .from("predictions")
    .select("id, user_id, match_id, outcome, outcome_encrypted")
    .not("outcome", "is", null)
    .is("outcome_encrypted", null);

  if (error) {
    throw new Error(`Failed to load predictions: ${error.message}`);
  }

  if (!rows?.length) {
    console.log("No predictions to encrypt.");
    return;
  }

  let updated = 0;

  for (const row of rows) {
    const outcome = row.outcome as PredictionOutcome;
    const outcomeEncrypted = encryptOutcome(outcome, {
      userId: row.user_id,
      matchId: row.match_id,
    });

    const { error: updateError } = await supabase
      .from("predictions")
      .update({ outcome_encrypted: outcomeEncrypted })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(
        `Failed to encrypt prediction ${row.id}: ${updateError.message}`,
      );
    }

    updated += 1;
  }

  console.log(`Encrypted ${updated} prediction(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
