import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

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

interface DbMatchRow {
  id: string;
  external_key: string;
  home_team_name: string;
  away_team_name: string;
}

function isPlaceholderTeam(name: string): boolean {
  if (/^[WL]?\d+[A-L]?$/.test(name)) return true;
  if (/^\d[A-L]$/.test(name)) return true;
  if (/^[WL]?\d+[A-Z](?:\/[A-Z])*$/.test(name)) return true;
  return false;
}

function resolveTeamName(currentName: string, incomingName: string): string {
  if (!isPlaceholderTeam(currentName) && isPlaceholderTeam(incomingName)) {
    return currentName;
  }
  return incomingName;
}

function parseKickoff(date: string, time: string): Date {
  const offsetMatch = time.match(/UTC([+-]\d+)/i);
  const offsetHours = offsetMatch ? Number(offsetMatch[1]) : 0;
  const timePart = time.replace(/\s*UTC[+-]\d+\s*/i, "").trim();
  const [hours, minutes] = timePart.split(":").map(Number);

  const [year, month, day] = date.split("-").map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hours - offsetHours, minutes);
  return new Date(utcMs);
}

function parseRoundKey(round: string): string {
  const matchday = round.match(/^Matchday (\d+)$/i);
  if (matchday) {
    const day = Number(matchday[1]);
    if (day >= 1 && day <= 7) return "group_1";
    if (day >= 8 && day <= 13) return "group_2";
    if (day >= 14 && day <= 17) return "group_3";
  }

  const normalized = round.toLowerCase().trim();
  if (normalized === "round of 32") return "round_of_32";
  if (normalized === "round of 16") return "round_of_16";
  if (normalized === "quarter-final" || normalized === "quarter-finals") {
    return "quarter_final";
  }
  if (normalized === "semi-final" || normalized === "semi-finals") {
    return "semi_final";
  }
  if (normalized.includes("third place")) return "third_place";
  if (normalized === "final") return "final";

  return normalized.replace(/\s+/g, "_");
}

function externalKeyForMatch(match: OpenFootballMatch): string {
  return match.num
    ? `wc2026-${match.num}`
    : `wc2026-${match.date}-${match.team1}-${match.team2}`;
}

async function upsertTeam(
  supabase: SupabaseClient,
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

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!cronSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing required environment secrets" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const providedSecret = req.headers.get("x-cron-secret");
  if (providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const response = await fetch(OPENFOOTBALL_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.status}`);
    }

    const data = (await response.json()) as OpenFootballData;
    const { data: dbMatches, error: dbError } = await supabase
      .from("matches")
      .select("id, external_key, home_team_name, away_team_name");

    if (dbError) throw dbError;

    const existingByKey = new Map<string, DbMatchRow>(
      (dbMatches ?? []).map((row) => [row.external_key, row as DbMatchRow]),
    );

    const teamCache = new Map<string, string>();
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const match of data.matches) {
      const externalKey = externalKeyForMatch(match);
      const homeTeamName = match.team1;
      const awayTeamName = match.team2;
      const roundKey = parseRoundKey(match.round);
      const kickoffAt = parseKickoff(match.date, match.time).toISOString();
      const existing = existingByKey.get(externalKey);

      if (existing) {
        const resolvedHomeName = resolveTeamName(
          existing.home_team_name,
          homeTeamName,
        );
        const resolvedAwayName = resolveTeamName(
          existing.away_team_name,
          awayTeamName,
        );
        const homeTeamId = await upsertTeam(
          supabase,
          resolvedHomeName,
          teamCache,
        );
        const awayTeamId = await upsertTeam(
          supabase,
          resolvedAwayName,
          teamCache,
        );

        const updatePayload = {
          round_key: roundKey,
          round_display: match.round,
          group_name: match.group ?? null,
          match_number: match.num ?? null,
          kickoff_at: kickoffAt,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_team_name: resolvedHomeName,
          away_team_name: resolvedAwayName,
          venue: match.ground ?? null,
          updated_at: new Date().toISOString(),
        };

        const namesUnchanged =
          resolvedHomeName === existing.home_team_name &&
          resolvedAwayName === existing.away_team_name;

        const { error: updateError } = await supabase
          .from("matches")
          .update(updatePayload)
          .eq("id", existing.id);

        if (updateError) throw updateError;

        if (namesUnchanged) {
          unchanged++;
        } else {
          updated++;
        }
      } else {
        const homeTeamId = await upsertTeam(supabase, homeTeamName, teamCache);
        const awayTeamId = await upsertTeam(supabase, awayTeamName, teamCache);

        const { error: insertError } = await supabase.from("matches").insert({
          external_key: externalKey,
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
          status: "scheduled",
        });

        if (insertError) throw insertError;
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted,
        updated,
        unchanged,
        total: data.matches.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("sync-schedule failed", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
