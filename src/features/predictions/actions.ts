"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentUserId } from "@/shared/lib/auth";

const predictionSchema = z.object({
  match_id: z.string().uuid(),
  outcome: z.enum(["home", "draw", "away"]),
});

export async function savePrediction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const parsed = predictionSchema.safeParse({
    match_id: formData.get("match_id"),
    outcome: formData.get("outcome"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { match_id, outcome } = parsed.data;

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, round_key, kickoff_at")
    .eq("id", match_id)
    .single();

  if (matchError || !match) return { error: "Match not found" };
  if (new Date(match.kickoff_at) <= new Date()) {
    return { error: "Predictions are locked after kickoff" };
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: userId,
      match_id,
      round_key: match.round_key,
      outcome,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  return { success: true };
}
