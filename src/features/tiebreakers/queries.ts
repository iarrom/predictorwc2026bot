import "server-only";

import {
  getTiebreakerRoundDeadline,
  getTiebreakerRoundMatchCount,
  isTiebreakerRoundLocked,
} from "@/entities/tiebreaker/lib/roundDeadlines";
import {
  TIEBREAKER_ROUNDS,
  type TiebreakerRoundKey,
  type TiebreakerRoundState,
} from "@/entities/tiebreaker/model/types";
import { getCurrentUserId, isParticipant } from "@/shared/lib/auth";
import { decryptTiebreakerGoals } from "@/shared/lib/tiebreaker-crypto";
import { createClient } from "@/shared/lib/supabase/server";

export interface TiebreakerPageData {
  rounds: TiebreakerRoundState[];
  canEdit: boolean;
}

export async function getTiebreakerPageData(): Promise<TiebreakerPageData> {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const canEdit = await isParticipant();

  const [{ data: matches }, tiebreakerRows] = await Promise.all([
    supabase.from("matches").select("round_key, kickoff_at"),
    userId
      ? supabase
          .from("tiebreakers")
          .select("round_key, goals_encrypted")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
  ]);

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

  return { rounds, canEdit };
}
