import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import type { Match } from "../src/entities/match/model/types";

function canonicalExternalKey(matchNumber: number): string {
  return `wc2026-${matchNumber}`;
}

function matchRank(match: Match): number {
  if (match.match_number == null) return 2;
  if (match.external_key === canonicalExternalKey(match.match_number)) return 0;
  return 1;
}

function pickPreferredMatch(current: Match, candidate: Match): Match {
  const currentRank = matchRank(current);
  const candidateRank = matchRank(candidate);

  if (candidateRank !== currentRank) {
    return candidateRank < currentRank ? candidate : current;
  }

  const currentUpdated = current.updated_at ?? "";
  const candidateUpdated = candidate.updated_at ?? "";

  if (candidateUpdated !== currentUpdated) {
    return candidateUpdated > currentUpdated ? candidate : current;
  }

  return candidate.id > current.id ? candidate : current;
}

function buildOrphanMap(matches: Match[]): Map<string, string> {
  const orphans = new Map<string, string>();

  for (const roundKey of ["final", "third_place"] as const) {
    const roundMatches = matches.filter((match) => match.round_key === roundKey);
    if (roundMatches.length <= 1) continue;

    const canonical = roundMatches.reduce((best, match) =>
      pickPreferredMatch(best, match),
    );
    for (const match of roundMatches) {
      if (match.id !== canonical.id) {
        orphans.set(match.id, canonical.id);
      }
    }
  }

  const byNumber = new Map<number, Match>();
  for (const match of matches) {
    if (match.match_number == null) continue;
    const existing = byNumber.get(match.match_number);
    byNumber.set(
      match.match_number,
      existing ? pickPreferredMatch(existing, match) : match,
    );
  }

  for (const match of matches) {
    if (match.match_number == null) continue;
    const canonical = byNumber.get(match.match_number);
    if (!canonical || canonical.id === match.id) continue;
    orphans.set(match.id, canonical.id);
  }

  return orphans;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, serviceKey);
  const { data: matches, error } = await supabase.from("matches").select("*");

  if (error) throw error;

  const typedMatches = (matches ?? []) as Match[];
  const orphanMap = buildOrphanMap(typedMatches);

  if (orphanMap.size === 0) {
    console.log("No duplicate matches found.");
    return;
  }

  console.log(`Found ${orphanMap.size} orphan match(es):`);
  for (const [orphanId, canonicalId] of orphanMap) {
    const orphan = typedMatches.find((match) => match.id === orphanId);
    const canonical = typedMatches.find((match) => match.id === canonicalId);
    console.log(
      `  ${orphan?.external_key} -> ${canonical?.external_key} (${orphan?.round_key})`,
    );
  }

  for (const [orphanId, canonicalId] of orphanMap) {
    const { data: predictions } = await supabase
      .from("predictions")
      .select("id, user_id")
      .eq("match_id", orphanId);

    for (const prediction of predictions ?? []) {
      const { data: existing } = await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", prediction.user_id)
        .eq("match_id", canonicalId)
        .maybeSingle();

      if (existing) {
        await supabase.from("predictions").delete().eq("id", prediction.id);
      } else {
        await supabase
          .from("predictions")
          .update({ match_id: canonicalId })
          .eq("id", prediction.id);
      }
    }

    const { data: events } = await supabase
      .from("match_events")
      .select("id, event_key")
      .eq("match_id", orphanId);

    for (const event of events ?? []) {
      const { data: existing } = await supabase
        .from("match_events")
        .select("id")
        .eq("match_id", canonicalId)
        .eq("event_key", event.event_key)
        .maybeSingle();

      if (existing) {
        await supabase.from("match_events").delete().eq("id", event.id);
      } else {
        await supabase
          .from("match_events")
          .update({ match_id: canonicalId })
          .eq("id", event.id);
      }
    }

    const { data: reminders } = await supabase
      .from("prediction_reminders")
      .select("user_id")
      .eq("match_id", orphanId);

    for (const reminder of reminders ?? []) {
      const { data: existing } = await supabase
        .from("prediction_reminders")
        .select("user_id")
        .eq("user_id", reminder.user_id)
        .eq("match_id", canonicalId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("prediction_reminders")
          .delete()
          .eq("user_id", reminder.user_id)
          .eq("match_id", orphanId);
      } else {
        await supabase
          .from("prediction_reminders")
          .update({ match_id: canonicalId })
          .eq("user_id", reminder.user_id)
          .eq("match_id", orphanId);
      }
    }

    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .eq("id", orphanId);

    if (deleteError) throw deleteError;
  }

  const { count } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  console.log(`Done. Total matches: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
