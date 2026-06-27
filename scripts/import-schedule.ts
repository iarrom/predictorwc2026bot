import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import {
  isPlaceholderTeam,
  resolveTeamName,
} from "../src/entities/match/lib/isPlaceholderTeam";
import { parseKickoff } from "../src/entities/match/lib/parseKickoff";
import { parseRoundKey } from "../src/entities/match/lib/parseRoundKey";

const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

interface OpenFootballMatch {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
}

interface OpenFootballData {
  matches: OpenFootballMatch[];
}

function externalKeyForMatch(match: OpenFootballMatch): string {
  return match.num
    ? `wc2026-${match.num}`
    : `wc2026-${match.date}-${match.team1}-${match.team2}`;
}

async function upsertTeam(
  supabase: ReturnType<typeof createClient>,
  name: string,
  cache: Map<string, string>,
): Promise<string | null> {
  if (isPlaceholderTeam(name)) return null;

  const cached = cache.get(name);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("teams")
    .upsert({ name }, { onConflict: "name" })
    .select("id")
    .single();

  if (error) throw error;
  cache.set(name, data.id);
  return data.id;
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
  const response = await fetch(OPENFOOTBALL_URL);
  if (!response.ok) throw new Error(`Failed to fetch schedule: ${response.status}`);

  const data = (await response.json()) as OpenFootballData;
  const { data: dbMatches, error: dbError } = await supabase
    .from("matches")
    .select("id, external_key, home_team_name, away_team_name");

  if (dbError) throw dbError;

  const existingByKey = new Map(
    (dbMatches ?? []).map((row) => [row.external_key, row]),
  );

  const teamCache = new Map<string, string>();
  let inserted = 0;
  let updated = 0;

  for (const match of data.matches) {
    const externalKey = externalKeyForMatch(match);
    const roundKey = parseRoundKey(match.round);
    const kickoffAt = parseKickoff(match.date, match.time).toISOString();
    const existing = existingByKey.get(externalKey);

    if (existing) {
      const homeTeamName = resolveTeamName(
        existing.home_team_name,
        match.team1,
      );
      const awayTeamName = resolveTeamName(
        existing.away_team_name,
        match.team2,
      );
      const homeTeamId = await upsertTeam(supabase, homeTeamName, teamCache);
      const awayTeamId = await upsertTeam(supabase, awayTeamName, teamCache);

      const { error } = await supabase
        .from("matches")
        .update({
          round_key: roundKey,
          round_display: match.round,
          group_name: match.group ?? null,
          match_number: match.num ?? null,
          kickoff_at: kickoffAt,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_team_name: homeTeamName,
          away_team_name: awayTeamName,
          venue: match.ground ?? null,
        })
        .eq("id", existing.id);

      if (error) throw error;
      updated++;
    } else {
      const homeTeamId = await upsertTeam(supabase, match.team1, teamCache);
      const awayTeamId = await upsertTeam(supabase, match.team2, teamCache);

      const { error } = await supabase.from("matches").insert({
        external_key: externalKey,
        round_key: roundKey,
        round_display: match.round,
        group_name: match.group ?? null,
        match_number: match.num ?? null,
        kickoff_at: kickoffAt,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_team_name: match.team1,
        away_team_name: match.team2,
        venue: match.ground ?? null,
        status: "scheduled",
      });

      if (error) throw error;
      inserted++;
    }
  }

  console.log(
    `Imported schedule from OpenFootball: ${inserted} inserted, ${updated} updated.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
