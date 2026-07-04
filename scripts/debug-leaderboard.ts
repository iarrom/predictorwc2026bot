import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { buildLeaderboardAnalytics } from "../src/features/leaderboard/lib/buildAnalytics";
import { decryptPredictionRows } from "../src/shared/lib/predictions-crypto-core";
import { fetchAllRows } from "../src/shared/lib/supabase/fetchAll";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const [{ data: matches }, predictions, { data: profiles }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id, round_key, status, home_score, away_score, winner"),
      fetchAllRows((from, to) =>
        supabase
          .from("predictions")
          .select("match_id, user_id, outcome_encrypted")
          .order("id", { ascending: true })
          .range(from, to),
      ),
      supabase
        .from("profiles")
        .select("id, display_name, photo_url, role")
        .in("role", ["participant", "admin"]),
    ]);

  const decrypted = decryptPredictionRows(
    predictions.map((p) => ({
      user_id: p.user_id,
      match_id: p.match_id,
      outcome_encrypted: p.outcome_encrypted,
    })),
  );

  console.log(
    `predictions=${predictions.length} decrypted=${decrypted.length}`,
  );

  const analytics = buildLeaderboardAnalytics({
    matches: matches ?? [],
    predictions: decrypted.map((row) => ({
      user_id: row.user_id,
      match_id: row.match_id,
      outcome: row.outcome,
    })),
    profiles: (profiles ?? []).map((p) => ({
      id: p.id,
      display_name: p.display_name,
      photo_url: p.photo_url,
    })),
  });

  console.log("\n=== group_1 (Матчдэй 1) ===");
  for (const entry of analytics.perStage["group_1"] ?? []) {
    console.log(
      `${entry.rank}. ${entry.display_name}: ${entry.points} pts (${entry.picks} picks)`,
    );
  }

  console.log("\n=== overall ===");
  for (const entry of analytics.overall) {
    console.log(
      `${entry.rank}. ${entry.display_name}: ${entry.total_points} pts`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
