import { getTranslations } from "next-intl/server";
import { buildLeaderboardAnalytics } from "@/features/leaderboard/lib/buildAnalytics";
import { LeaderboardLiveRefresh } from "@/features/leaderboard/ui/LeaderboardLiveRefresh";
import { LeaderboardTabs } from "@/features/leaderboard/ui/LeaderboardTabs";
import { getTiebreakerLeaderboardData } from "@/features/tiebreakers/queries";
import {
  canSeePlayerNames,
  getCurrentUserId,
} from "@/shared/lib/auth";
import { LEADERBOARD_EXCLUDED_TELEGRAM_IDS } from "@/shared/lib/leaderboard";
import { decryptPredictionRows } from "@/shared/lib/predictions-crypto";
import { createClient } from "@/shared/lib/supabase/server";

export default async function LeaderboardPage() {
  const t = await getTranslations("leaderboard");
  const supabase = await createClient();
  const showNames = await canSeePlayerNames();
  const currentUserId = await getCurrentUserId();

  const [
    { data: matches },
    { data: predictions },
    { data: profiles },
    tiebreakerLeaderboard,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, round_key, status, home_score, away_score"),
    supabase
      .from("predictions")
      .select("match_id, user_id, outcome_encrypted"),
    supabase
      .from("profiles")
      .select("id, display_name, photo_url, role, telegram_id")
      .in("role", ["participant", "admin"]),
    getTiebreakerLeaderboardData(),
  ]);

  const eligibleProfiles = (profiles ?? []).filter(
    (profile) =>
      profile.telegram_id === null ||
      !LEADERBOARD_EXCLUDED_TELEGRAM_IDS.includes(
        profile.telegram_id as (typeof LEADERBOARD_EXCLUDED_TELEGRAM_IDS)[number],
      ),
  );

  const decryptedRows = decryptPredictionRows(
    (predictions ?? []).map((prediction) => ({
      user_id: prediction.user_id,
      match_id: prediction.match_id,
      outcome_encrypted: prediction.outcome_encrypted,
    })),
  );

  const analytics = buildLeaderboardAnalytics({
    matches: matches ?? [],
    predictions: decryptedRows.map((row) => ({
      user_id: row.user_id,
      match_id: row.match_id,
      outcome: row.outcome,
    })),
    profiles: eligibleProfiles.map((profile) => ({
      id: profile.id,
      display_name: profile.display_name,
      photo_url: profile.photo_url,
    })),
    tiebreakerOverallByUser: tiebreakerLeaderboard.overallByUser,
    tiebreakerRoundDeviationByUser: tiebreakerLeaderboard.roundDeviationByUser,
  });

  return (
    <LeaderboardLiveRefresh>
      <div className="flex flex-col">
        <div className="sports-panel corner-squircle sports-panel-max-h flex flex-col">
          <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
            <h1 className="text-[15px] font-semibold text-foreground">
              {t("title")}
            </h1>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {t("description")}
            </p>
          </div>

          <LeaderboardTabs
            analytics={analytics}
            currentUserId={currentUserId}
            canSeePlayerNames={showNames}
          />
        </div>
      </div>
    </LeaderboardLiveRefresh>
  );
}
