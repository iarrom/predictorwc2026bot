import type { Match, MatchEvent } from "@/entities/match/model/types";
import { buildPlayerPhotosMap } from "@/features/matches/lib/playerPhotos";
import type { PlayerPhotosByTeam } from "@/features/matches/lib/playerPhotos";
import { buildPredictionsByMatch } from "@/features/matches/lib/predictionsByMatch";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import { shouldRevealMatchPredictions } from "@/features/matches/lib/shouldRevealMatchPredictions";
import { buildTeamColorsMap } from "@/features/matches/lib/teamColors";
import { buildVoterMap } from "@/features/matches/lib/voterInfo";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { decryptPredictionForDisplay } from "@/features/predictions/lib/decryptForDisplay";
import {
  canSeePlayerNames,
  getCurrentUserId,
  isParticipant,
} from "@/shared/lib/auth";
import { LEADERBOARD_EXCLUDED_TELEGRAM_IDS } from "@/shared/lib/leaderboard";
import { getUpsets } from "@/shared/lib/onside/client";
import { buildUpsetMatchIds } from "@/shared/lib/onside/upsets";
import { decryptPredictionRows } from "@/shared/lib/predictions-crypto";
import { createClient } from "@/shared/lib/supabase/server";

export interface MatchesBundle {
  matches: Match[];
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  predictionsByMatch: Record<string, MatchPredictionEntry[]>;
  eventsByMatch: Record<string, MatchEvent[]>;
  currentUserId: string | null;
  teamColors: Record<string, string>;
  playerPhotosByTeam: PlayerPhotosByTeam;
  canPredict: boolean;
  canSeePlayerNames: boolean;
  upsetMatchIds: Set<string>;
}

export async function loadMatchesBundle(): Promise<MatchesBundle> {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const canPredict = await isParticipant();
  const showPlayerNames = await canSeePlayerNames();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  const typedMatches = (matches ?? []) as Match[];
  const revealableMatchIds = new Set(
    typedMatches
      .filter((match) => shouldRevealMatchPredictions(match))
      .map((match) => match.id),
  );

  const [
    { data: predictions },
    { data: allPredictions },
    { data: profiles },
    { data: excludedProfiles },
    { data: teams },
    { data: players },
    { data: matchEvents },
  ] = await Promise.all([
    userId
      ? supabase
          .from("predictions")
          .select("match_id, round_key, outcome_encrypted, points_awarded")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("predictions")
      .select("match_id, user_id, outcome_encrypted, points_awarded"),
    supabase.from("profiles").select("id, display_name, photo_url"),
    supabase
      .from("profiles")
      .select("id")
      .in("telegram_id", [...LEADERBOARD_EXCLUDED_TELEGRAM_IDS]),
    supabase.from("teams").select("name, primary_color"),
    supabase
      .from("players")
      .select("team_id, shirt_number, photo_url")
      .not("photo_url", "is", null),
    supabase
      .from("match_events")
      .select("*")
      .order("minute", { ascending: true }),
  ]);

  const excludedUserIds = new Set(
    (excludedProfiles ?? []).map((profile) => profile.id),
  );

  const publicPredictions = (allPredictions ?? []).filter(
    (prediction) => !excludedUserIds.has(prediction.user_id),
  );

  const predictionMap = Object.fromEntries(
    (predictions ?? []).flatMap((p) => {
      const outcome = decryptPredictionForDisplay(
        p.outcome_encrypted,
        userId!,
        p.match_id,
      );

      if (!outcome) {
        return [];
      }

      return [
        [
          p.match_id,
          {
            round_key: p.round_key,
            outcome,
            points_awarded: p.points_awarded,
          },
        ],
      ];
    }),
  );

  const voterMap = Object.fromEntries(
    buildVoterMap(
      publicPredictions.map((prediction) => ({
        match_id: prediction.match_id,
      })),
    ),
  );

  const revealablePredictions = publicPredictions.filter((prediction) =>
    revealableMatchIds.has(prediction.match_id),
  );

  const decryptedRows = decryptPredictionRows(
    revealablePredictions.map((prediction) => ({
      user_id: prediction.user_id,
      match_id: prediction.match_id,
      outcome_encrypted: prediction.outcome_encrypted,
    })),
  );

  const revealedPredictions = decryptedRows.map((row) => {
    const source = revealablePredictions.find(
      (prediction) =>
        prediction.user_id === row.user_id &&
        prediction.match_id === row.match_id,
    );

    return {
      match_id: row.match_id,
      user_id: row.user_id,
      outcome: row.outcome,
      points_awarded: source?.points_awarded ?? null,
    };
  });

  const predictionsByMatch = buildPredictionsByMatch(
    revealedPredictions,
    profiles ?? [],
  );

  const teamColors = buildTeamColorsMap(teams ?? []);
  const playerPhotosByTeam = buildPlayerPhotosMap(players ?? []);

  const upsetsResponse = await getUpsets();
  const upsetMatchIds = buildUpsetMatchIds(
    typedMatches,
    upsetsResponse?.upsets ?? [],
  );

  const eventsByMatch = (matchEvents ?? []).reduce<
    Record<string, MatchEvent[]>
  >((acc, event) => {
    const list = acc[event.match_id] ?? [];
    list.push(event as MatchEvent);
    acc[event.match_id] = list;
    return acc;
  }, {});

  return {
    matches: typedMatches,
    voterMap,
    predictionMap,
    predictionsByMatch,
    eventsByMatch,
    currentUserId: userId,
    teamColors,
    playerPhotosByTeam,
    canPredict,
    canSeePlayerNames: showPlayerNames,
    upsetMatchIds,
  };
}
