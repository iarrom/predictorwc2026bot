import "server-only";

import type { Match } from "@/entities/match/model/types";
import { buildTiebreakerStandings } from "@/entities/tiebreaker/lib/standings";
import type { TiebreakerRoundKey } from "@/entities/tiebreaker/model/types";
import { STAGE_ORDER } from "@/features/leaderboard/lib/buildAnalytics";
import type { LeaderboardOverallEntry } from "@/features/leaderboard/lib/buildAnalytics";
import { buildPredictionsByMatch } from "@/features/matches/lib/predictionsByMatch";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { shouldRevealMatchPredictions } from "@/features/matches/lib/shouldRevealMatchPredictions";
import {
  buildResultsStandings,
  type ResultsPrediction,
} from "@/features/results/lib/buildResultsStandings";
import { LEADERBOARD_EXCLUDED_TELEGRAM_IDS } from "@/shared/lib/leaderboard";
import { decryptPredictionRows } from "@/shared/lib/predictions-crypto";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { fetchAllRows } from "@/shared/lib/supabase/fetchAll";
import { decryptTiebreakerRows } from "@/shared/lib/tiebreaker-crypto";

export interface ResultsData {
  matches: Match[];
  stages: string[];
  matchesByStage: Record<string, Match[]>;
  revealableMatchIds: string[];
  predictionsByMatch: Record<string, MatchPredictionEntry[]>;
  overall: LeaderboardOverallEntry[];
  tiebreaker: ReturnType<typeof buildTiebreakerStandings>;
}

export async function loadResultsData(): Promise<ResultsData> {
  const supabase = createAdminClient();

  const [
    { data: matches },
    allPredictions,
    { data: profiles },
    { data: excludedProfiles },
    { data: allTiebreakerRows },
  ] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
    fetchAllRows((from, to) =>
      supabase
        .from("predictions")
        .select("match_id, user_id, outcome_encrypted, points_awarded")
        .order("id", { ascending: true })
        .range(from, to),
    ),
    supabase
      .from("profiles")
      .select("id, display_name, photo_url, telegram_id, role")
      .in("role", ["participant", "admin"]),
    supabase
      .from("profiles")
      .select("id")
      .in("telegram_id", [...LEADERBOARD_EXCLUDED_TELEGRAM_IDS]),
    supabase.from("tiebreakers").select("user_id, round_key, goals_encrypted"),
  ]);

  const typedMatches = (matches ?? []) as Match[];
  const excludedUserIds = new Set(
    (excludedProfiles ?? []).map((profile) => profile.id),
  );

  const eligibleProfiles = (profiles ?? []).filter(
    (profile) => !excludedUserIds.has(profile.id),
  );

  const revealableMatchIds = typedMatches
    .filter((match) => shouldRevealMatchPredictions(match))
    .map((match) => match.id);

  const revealableMatchIdSet = new Set(revealableMatchIds);

  const publicPredictions = allPredictions.filter(
    (prediction) => !excludedUserIds.has(prediction.user_id),
  );

  const revealablePredictions = publicPredictions.filter((prediction) =>
    revealableMatchIdSet.has(prediction.match_id),
  );

  const decryptedRows = decryptPredictionRows(
    revealablePredictions.map((prediction) => ({
      user_id: prediction.user_id,
      match_id: prediction.match_id,
      outcome_encrypted: prediction.outcome_encrypted,
    })),
  );

  const resultsPredictions: ResultsPrediction[] = decryptedRows.map((row) => {
    const source = revealablePredictions.find(
      (prediction) =>
        prediction.user_id === row.user_id &&
        prediction.match_id === row.match_id,
    );

    return {
      user_id: row.user_id,
      match_id: row.match_id,
      outcome: row.outcome,
      points_awarded: source?.points_awarded ?? null,
    };
  });

  const predictionsByMatch = buildPredictionsByMatch(
    resultsPredictions.map((prediction) => ({
      match_id: prediction.match_id,
      user_id: prediction.user_id,
      outcome: prediction.outcome,
      points_awarded: prediction.points_awarded,
    })),
    eligibleProfiles,
  );

  const tiebreakerMatches = typedMatches.map((match) => ({
    round_key: match.round_key,
    kickoff_at: match.kickoff_at,
    status: match.status,
    home_score: match.home_score,
    away_score: match.away_score,
  }));

  const decryptedTiebreakerRows = decryptTiebreakerRows(
    (allTiebreakerRows ?? []).map((row) => ({
      user_id: row.user_id,
      round_key: row.round_key as TiebreakerRoundKey,
      goals_encrypted: row.goals_encrypted,
    })),
  ).filter((row) => !excludedUserIds.has(row.user_id));

  const tiebreaker = buildTiebreakerStandings({
    matches: tiebreakerMatches,
    decryptedRows: decryptedTiebreakerRows,
    profiles: eligibleProfiles.map((profile) => ({
      id: profile.id,
      display_name: profile.display_name,
      photo_url: profile.photo_url,
    })),
  });

  const tiebreakerOverallByUser = new Map(
    tiebreaker.rows.map((row) => [row.userId, row.overall]),
  );

  const overall = buildResultsStandings({
    matches: typedMatches,
    predictions: resultsPredictions,
    profiles: eligibleProfiles.map((profile) => ({
      id: profile.id,
      display_name: profile.display_name,
      photo_url: profile.photo_url,
    })),
    tiebreakerOverallByUser,
  });

  const stagesWithMatches = new Set(typedMatches.map((match) => match.round_key));
  const stages = STAGE_ORDER.filter((stage) => stagesWithMatches.has(stage));

  const matchesByStage = Object.fromEntries(
    stages.map((stage) => [
      stage,
      typedMatches.filter((match) => match.round_key === stage),
    ]),
  ) as Record<string, Match[]>;

  return {
    matches: typedMatches,
    stages,
    matchesByStage,
    revealableMatchIds,
    predictionsByMatch,
    overall,
    tiebreaker,
  };
}
