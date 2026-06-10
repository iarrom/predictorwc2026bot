import "server-only";

import {
  getTiebreakerRoundDeadline,
  getTiebreakerRoundMatchCount,
  isTiebreakerRoundLocked,
} from "@/entities/tiebreaker/lib/roundDeadlines";
import {
  buildTiebreakerStandings,
  type TiebreakerStandingsResult,
} from "@/entities/tiebreaker/lib/standings";
import {
  TIEBREAKER_ROUNDS,
  type TiebreakerRoundKey,
  type TiebreakerRoundState,
} from "@/entities/tiebreaker/model/types";
import {
  canSeePlayerNames,
  getCurrentUserId,
  isParticipant,
} from "@/shared/lib/auth";
import { LEADERBOARD_EXCLUDED_TELEGRAM_IDS } from "@/shared/lib/leaderboard";
import {
  decryptTiebreakerGoals,
  decryptTiebreakerRows,
} from "@/shared/lib/tiebreaker-crypto";
import { createClient } from "@/shared/lib/supabase/server";

export interface TiebreakerPageData {
  rounds: TiebreakerRoundState[];
  canEdit: boolean;
  standings: TiebreakerStandingsResult;
  showPlayerNames: boolean;
  currentUserId: string | null;
}

export interface TiebreakerLeaderboardData {
  overallByUser: Map<string, number | null>;
  roundDeviationByUser: Map<
    string,
    Record<TiebreakerRoundKey, number | null>
  >;
}

export async function getTiebreakerLeaderboardData(): Promise<TiebreakerLeaderboardData> {
  const supabase = await createClient();

  const [{ data: matches }, { data: allTiebreakerRows }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("round_key, kickoff_at, status, home_score, away_score"),
      supabase
        .from("tiebreakers")
        .select("user_id, round_key, goals_encrypted"),
      supabase
        .from("profiles")
        .select("id, display_name, photo_url")
        .in("role", ["participant", "admin"]),
    ]);

  const decryptedRows = decryptTiebreakerRows(
    (allTiebreakerRows ?? []).map((row) => ({
      user_id: row.user_id,
      round_key: row.round_key as TiebreakerRoundKey,
      goals_encrypted: row.goals_encrypted,
    })),
  );

  const standings = buildTiebreakerStandings({
    matches: matches ?? [],
    decryptedRows,
    profiles: (profiles ?? []).map((profile) => ({
      id: profile.id,
      display_name: profile.display_name,
      photo_url: profile.photo_url,
    })),
  });

  return {
    overallByUser: new Map(
      standings.rows.map((row) => [row.userId, row.overall]),
    ),
    roundDeviationByUser: new Map(
      standings.rows.map((row) => [
        row.userId,
        {
          group_1: row.perRound.group_1?.deviation ?? null,
          group_2: row.perRound.group_2?.deviation ?? null,
          group_3: row.perRound.group_3?.deviation ?? null,
          playoff: row.perRound.playoff?.deviation ?? null,
        },
      ]),
    ),
  };
}

export async function getTiebreakerOverallByUser(): Promise<
  Map<string, number | null>
> {
  const data = await getTiebreakerLeaderboardData();
  return data.overallByUser;
}

export async function getTiebreakerPageData(): Promise<TiebreakerPageData> {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const canEdit = await isParticipant();
  const showPlayerNames = await canSeePlayerNames();

  const [
    { data: matches },
    tiebreakerRows,
    { data: allTiebreakerRows },
    { data: profiles },
    { data: excludedProfiles },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("round_key, kickoff_at, status, home_score, away_score"),
    userId
      ? supabase
          .from("tiebreakers")
          .select("round_key, goals_encrypted")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    supabase.from("tiebreakers").select("user_id, round_key, goals_encrypted"),
    supabase
      .from("profiles")
      .select("id, display_name, photo_url, telegram_id, role")
      .in("role", ["participant", "admin"]),
    supabase
      .from("profiles")
      .select("id")
      .in("telegram_id", [...LEADERBOARD_EXCLUDED_TELEGRAM_IDS]),
  ]);

  const excludedUserIds = new Set(
    (excludedProfiles ?? []).map((profile) => profile.id),
  );

  const goalsByRound = new Map(
    (tiebreakerRows.data ?? []).map((row) => {
      const goals = decryptTiebreakerGoals(row.goals_encrypted, {
        userId: userId!,
        roundKey: row.round_key as TiebreakerRoundKey,
      });

      return [row.round_key, goals] as const;
    }),
  );

  const rounds: TiebreakerRoundState[] = TIEBREAKER_ROUNDS.map((round) => {
    const deadlineAt = getTiebreakerRoundDeadline(matches ?? [], round.key);

    return {
      roundKey: round.key,
      label: round.label,
      maxGoals: round.maxGoals,
      matchCount: getTiebreakerRoundMatchCount(matches ?? [], round.key),
      goals: goalsByRound.get(round.key) ?? null,
      locked: isTiebreakerRoundLocked(deadlineAt),
      deadlineAt,
    };
  });

  const decryptedRows = decryptTiebreakerRows(
    (allTiebreakerRows ?? []).map((row) => ({
      user_id: row.user_id,
      round_key: row.round_key as TiebreakerRoundKey,
      goals_encrypted: row.goals_encrypted,
    })),
  );

  const standings = buildTiebreakerStandings({
    matches: matches ?? [],
    decryptedRows,
    profiles: (profiles ?? [])
      .filter((profile) => !excludedUserIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        display_name: profile.display_name,
        photo_url: profile.photo_url,
      })),
  });

  return {
    rounds,
    canEdit,
    standings,
    showPlayerNames,
    currentUserId: userId,
  };
}
