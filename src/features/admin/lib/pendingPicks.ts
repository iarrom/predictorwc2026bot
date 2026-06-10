import type { Match } from "@/entities/match/model/types";
import { createClient } from "@/shared/lib/supabase/server";

export interface PendingParticipant {
  id: string;
  display_name: string;
  telegram_id: number;
  locale: string | null;
  timezone: string | null;
}

async function getPendingForMatchId(
  matchId: string,
): Promise<PendingParticipant[]> {
  const supabase = await createClient();

  const [{ data: participants }, { data: predictions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, telegram_id, locale, timezone")
      .in("role", ["participant", "admin"])
      .not("telegram_id", "is", null),
    supabase.from("predictions").select("user_id").eq("match_id", matchId),
  ]);

  const predictedUserIds = new Set(
    (predictions ?? []).map((prediction) => prediction.user_id),
  );

  return (participants ?? [])
    .filter((participant) => !predictedUserIds.has(participant.id))
    .map((participant) => ({
      id: participant.id,
      display_name: participant.display_name,
      telegram_id: participant.telegram_id as number,
      locale: participant.locale,
      timezone: participant.timezone,
    }));
}

export async function getNextMatchPending(): Promise<{
  nextMatch: Match | null;
  pending: PendingParticipant[];
}> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .gt("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!match) {
    return { nextMatch: null, pending: [] };
  }

  const pending = await getPendingForMatchId(match.id);

  return { nextMatch: match as Match, pending };
}

export async function getPendingForMatch(
  matchId: string,
): Promise<PendingParticipant[]> {
  return getPendingForMatchId(matchId);
}
