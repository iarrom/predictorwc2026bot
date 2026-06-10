"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { buildPingMessage } from "@/features/admin/lib/buildPingMessage";
import { getPendingForMatch } from "@/features/admin/lib/pendingPicks";
import { getCurrentUserId, isAdmin } from "@/shared/lib/auth";
import { getEnv } from "@/shared/lib/env";
import { createClient } from "@/shared/lib/supabase/server";
import { sendTelegramMessage } from "@/shared/lib/telegram";

const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["guest", "participant", "admin"]),
});

export async function updateUserRole(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations("common.errors");

  if (!(await isAdmin())) return { error: t("forbidden") };

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: t("notAuthenticated") };

  const parsed = updateRoleSchema.safeParse({
    user_id: formData.get("user_id"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };
  }

  const { user_id, role } = parsed.data;

  if (user_id === currentUserId && role !== "admin") {
    return { error: t("cantChangeOwnAdminRole") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", user_id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { success: true };
}

const pingSchema = z.object({
  user_id: z.string().uuid(),
  match_id: z.string().uuid(),
});

const pingAllSchema = z.object({
  match_id: z.string().uuid(),
});

async function loadOpenMatch(matchId: string) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: match, error } = await supabase
    .from("matches")
    .select("id, home_team_name, away_team_name, kickoff_at")
    .eq("id", matchId)
    .gt("kickoff_at", nowIso)
    .maybeSingle();

  if (error) return { error: error.message as string };
  if (!match) return { error: "matchNotFound" as const };
  return { match };
}

export async function pingUser(
  userId: string,
  matchId: string,
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations("common.errors");
  const tPing = await getTranslations("admin.ping");

  if (!(await isAdmin())) return { error: t("forbidden") };

  const parsed = pingSchema.safeParse({ user_id: userId, match_id: matchId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };
  }

  const matchResult = await loadOpenMatch(parsed.data.match_id);
  if ("error" in matchResult) {
    return {
      error: matchResult.error === "matchNotFound" ? t("matchNotFound") : matchResult.error,
    };
  }

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, telegram_id, locale, timezone")
    .eq("id", parsed.data.user_id)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile) return { error: tPing("userNotFound") };
  if (profile.role !== "participant" && profile.role !== "admin") {
    return { error: tPing("notParticipant") };
  }
  if (profile.telegram_id == null) {
    return { error: tPing("noTelegram") };
  }

  const { data: existingPrediction } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", parsed.data.user_id)
    .eq("match_id", parsed.data.match_id)
    .maybeSingle();

  if (existingPrediction) {
    return { error: tPing("alreadyPredicted") };
  }

  const { text, buttonText } = await buildPingMessage(
    matchResult.match,
    profile.locale,
    profile.timezone,
  );
  const miniAppUrl = getEnv("MINI_APP_URL") ?? undefined;
  const delivered = await sendTelegramMessage(
    profile.telegram_id,
    text,
    miniAppUrl ? buttonText : undefined,
    miniAppUrl,
  );

  if (!delivered) {
    return { error: tPing("sendFailed") };
  }

  return { success: true };
}

export async function pingAllPending(
  matchId: string,
): Promise<{ error?: string; sent?: number; failed?: number }> {
  const t = await getTranslations("common.errors");
  const tPing = await getTranslations("admin.ping");

  if (!(await isAdmin())) return { error: t("forbidden") };

  const parsed = pingAllSchema.safeParse({ match_id: matchId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };
  }

  const matchResult = await loadOpenMatch(parsed.data.match_id);
  if ("error" in matchResult) {
    return {
      error: matchResult.error === "matchNotFound" ? t("matchNotFound") : matchResult.error,
    };
  }

  const pending = await getPendingForMatch(parsed.data.match_id);
  if (!pending.length) {
    return { error: tPing("noPending") };
  }

  const miniAppUrl = getEnv("MINI_APP_URL") ?? undefined;
  let sent = 0;
  let failed = 0;

  for (const participant of pending) {
    const { text, buttonText } = await buildPingMessage(
      matchResult.match,
      participant.locale,
      participant.timezone,
    );
    const delivered = await sendTelegramMessage(
      participant.telegram_id,
      text,
      miniAppUrl ? buttonText : undefined,
      miniAppUrl,
    );

    if (delivered) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return { sent, failed };
}
