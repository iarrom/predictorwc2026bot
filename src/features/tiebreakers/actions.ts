"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import {
  TIEBREAKER_ROUND_KEYS,
  TIEBREAKER_ROUNDS,
  type TiebreakerRoundKey,
} from "@/entities/tiebreaker/model/types";
import {
  getTiebreakerRoundDeadline,
  isTiebreakerRoundLocked,
  matchBelongsToTiebreakerRound,
} from "@/entities/tiebreaker/lib/roundDeadlines";
import { getCurrentUserId, isParticipant } from "@/shared/lib/auth";
import { encryptTiebreakerGoals } from "@/shared/lib/tiebreaker-crypto";
import { createClient } from "@/shared/lib/supabase/server";

const roundKeySchema = z.enum(TIEBREAKER_ROUND_KEYS);

function getMaxGoals(roundKey: TiebreakerRoundKey): number {
  return (
    TIEBREAKER_ROUNDS.find((round) => round.key === roundKey)?.maxGoals ?? 100
  );
}

export async function saveTiebreaker(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations("common.errors");
  const userId = await getCurrentUserId();
  if (!userId) return { error: t("notAuthenticated") };

  const canEdit = await isParticipant();
  if (!canEdit) {
    return { error: t("tiebreakerRequiresApproval") };
  }

  const roundKeyResult = roundKeySchema.safeParse(formData.get("round_key"));
  if (!roundKeyResult.success) {
    return { error: t("invalidRound") };
  }

  const roundKey = roundKeyResult.data;
  const maxGoals = getMaxGoals(roundKey);

  const goalsResult = z.coerce
    .number()
    .int()
    .min(0)
    .max(maxGoals)
    .safeParse(formData.get("goals"));

  if (!goalsResult.success) {
    return {
      error: t("goalsRange", { max: maxGoals }),
    };
  }

  const supabase = await createClient();
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("round_key, kickoff_at");

  if (matchesError) {
    return { error: matchesError.message };
  }

  const deadlineAt = getTiebreakerRoundDeadline(matches ?? [], roundKey);
  if (isTiebreakerRoundLocked(deadlineAt)) {
    return { error: t("roundLocked") };
  }

  const roundMatches = (matches ?? []).filter((match) =>
    matchBelongsToTiebreakerRound(match.round_key, roundKey),
  );

  if (roundMatches.length === 0) {
    return { error: t("roundNotFound") };
  }

  const goalsEncrypted = encryptTiebreakerGoals(goalsResult.data, {
    userId,
    roundKey,
  });

  const { error } = await supabase.from("tiebreakers").upsert(
    {
      user_id: userId,
      round_key: roundKey,
      goals_encrypted: goalsEncrypted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,round_key" },
  );

  if (error) return { error: error.message };

  revalidatePath("/tiebreaker");
  return { success: true };
}
