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

const WINNER_LOSER_PATTERN = /^([WL])(\d+)$/;

interface KnockoutMatchForResolve {
  id: string;
  match_number: number | null;
  status: string;
  winner: "home" | "away" | "draw" | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string;
  away_team_name: string;
}

interface KnockoutTeamPatch {
  id: string;
  home_team_name?: string;
  home_team_id?: string | null;
  away_team_name?: string;
  away_team_id?: string | null;
}

function parseWinnerLoserPlaceholder(
  name: string,
): { type: "W" | "L"; matchNumber: number } | null {
  const match = name.match(WINNER_LOSER_PATTERN);
  if (!match) return null;
  return { type: match[1] as "W" | "L", matchNumber: Number(match[2]) };
}

function resolvePlaceholderFromParent(
  placeholder: string,
  byMatchNumber: Map<number, KnockoutMatchForResolve>,
): { name: string; teamId: string | null } | null {
  const parsed = parseWinnerLoserPlaceholder(placeholder);
  if (!parsed) return null;

  const parent = byMatchNumber.get(parsed.matchNumber);
  if (!parent || parent.status !== "finished") return null;
  if (parent.winner !== "home" && parent.winner !== "away") return null;

  const loserSide = parent.winner === "home" ? "away" : "home";
  const side = parsed.type === "W" ? parent.winner : loserSide;

  const name = side === "home" ? parent.home_team_name : parent.away_team_name;
  const teamId = side === "home" ? parent.home_team_id : parent.away_team_id;

  if (isPlaceholderTeam(name)) return null;

  return { name, teamId };
}

function resolveKnockoutTeamPatches(
  matches: KnockoutMatchForResolve[],
): KnockoutTeamPatch[] {
  const byNumber = new Map<number, KnockoutMatchForResolve>();
  const originals = new Map<
    string,
    {
      home: string;
      away: string;
      homeId: string | null;
      awayId: string | null;
    }
  >();

  for (const match of matches) {
    if (match.match_number == null) continue;

    byNumber.set(match.match_number, { ...match });
    originals.set(match.id, {
      home: match.home_team_name,
      away: match.away_team_name,
      homeId: match.home_team_id,
      awayId: match.away_team_id,
    });
  }

  const patches: KnockoutTeamPatch[] = [];
  const sortedNumbers = [...byNumber.keys()].sort((a, b) => a - b);

  for (const matchNumber of sortedNumbers) {
    const current = byNumber.get(matchNumber)!;
    let newHome = current.home_team_name;
    let newHomeId = current.home_team_id;
    let newAway = current.away_team_name;
    let newAwayId = current.away_team_id;

    const homeResolved = resolvePlaceholderFromParent(
      current.home_team_name,
      byNumber,
    );
    if (homeResolved) {
      newHome = homeResolved.name;
      newHomeId = homeResolved.teamId;
    }

    const awayResolved = resolvePlaceholderFromParent(
      current.away_team_name,
      byNumber,
    );
    if (awayResolved) {
      newAway = awayResolved.name;
      newAwayId = awayResolved.teamId;
    }

    const orig = originals.get(current.id)!;
    const homeChanged = newHome !== orig.home || newHomeId !== orig.homeId;
    const awayChanged = newAway !== orig.away || newAwayId !== orig.awayId;

    if (!homeChanged && !awayChanged) continue;

    byNumber.set(matchNumber, {
      ...current,
      home_team_name: newHome,
      home_team_id: newHomeId,
      away_team_name: newAway,
      away_team_id: newAwayId,
    });

    const patch: KnockoutTeamPatch = { id: current.id };
    if (homeChanged) {
      patch.home_team_name = newHome;
      patch.home_team_id = newHomeId;
    }
    if (awayChanged) {
      patch.away_team_name = newAway;
      patch.away_team_id = newAwayId;
    }
    patches.push(patch);
  }

  return patches;
}

async function resolveKnockoutPlaceholders(
  supabase: SupabaseClient,
  teamCache: Map<string, string>,
): Promise<number> {
  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "id, match_number, status, winner, home_team_id, away_team_id, home_team_name, away_team_name",
    );

  if (error) throw error;

  const patches = resolveKnockoutTeamPatches(
    (matches ?? []) as KnockoutMatchForResolve[],
  );

  let resolved = 0;

  for (const patch of patches) {
    const updatePayload: Record<string, string | null> = {};

    if (patch.home_team_name !== undefined) {
      updatePayload.home_team_name = patch.home_team_name;
      updatePayload.home_team_id =
        patch.home_team_id ??
        (await upsertTeam(supabase, patch.home_team_name, teamCache));
    }

    if (patch.away_team_name !== undefined) {
      updatePayload.away_team_name = patch.away_team_name;
      updatePayload.away_team_id =
        patch.away_team_id ??
        (await upsertTeam(supabase, patch.away_team_name, teamCache));
    }

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", patch.id);

    if (updateError) throw updateError;
    resolved++;
  }

  return resolved;
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

    const resolved = await resolveKnockoutPlaceholders(supabase, teamCache);

    return new Response(
      JSON.stringify({
        ok: true,
        inserted,
        updated,
        unchanged,
        resolved,
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
