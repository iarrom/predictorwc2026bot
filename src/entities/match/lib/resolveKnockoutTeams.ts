import { isPlaceholderTeam } from "@/entities/match/lib/isPlaceholderTeam";

const WINNER_LOSER_PATTERN = /^([WL])(\d+)$/;

export interface KnockoutMatchForResolve {
  id: string;
  match_number: number | null;
  status: string;
  winner: "home" | "away" | "draw" | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string;
  away_team_name: string;
}

export interface KnockoutTeamPatch {
  id: string;
  home_team_name?: string;
  home_team_id?: string | null;
  away_team_name?: string;
  away_team_id?: string | null;
}

export function parseWinnerLoserPlaceholder(
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

/** Resolve W{n}/L{n} placeholders from finished parent matches (cascading by match_number). */
export function resolveKnockoutTeamPatches(
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
