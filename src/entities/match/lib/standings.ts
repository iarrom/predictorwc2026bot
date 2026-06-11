import type { Match } from "@/entities/match/model/types";

export type TeamStandingLiveState = "winning" | "drawing" | "losing";

export interface TeamStandingLive {
  score: string;
  state: TeamStandingLiveState;
}

export interface TeamStandingRow {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  live?: TeamStandingLive;
}

export interface GroupStanding {
  groupName: string;
  rows: TeamStandingRow[];
}

interface TeamStats {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

function createEmptyStats(teamName: string): TeamStats {
  return {
    teamName,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };
}

function getGroupSortKey(groupName: string): number {
  const match = groupName.match(/Group\s+([A-Z])/i);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return match[1].charCodeAt(0) - 65;
}

function isGroupMatch(match: Match): boolean {
  return match.round_key.startsWith("group_") && match.group_name != null;
}

function isFinishedWithScore(match: Match): boolean {
  return (
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function isLiveWithScore(match: Match): boolean {
  return (
    match.status === "live" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function isScoredGroupMatch(match: Match): boolean {
  return isFinishedWithScore(match) || isLiveWithScore(match);
}

function getLiveState(
  teamScore: number,
  opponentScore: number,
): TeamStandingLiveState {
  if (teamScore > opponentScore) {
    return "winning";
  }

  if (teamScore < opponentScore) {
    return "losing";
  }

  return "drawing";
}

function toLiveInfo(
  teamScore: number,
  opponentScore: number,
): TeamStandingLive {
  return {
    score: `${teamScore}:${opponentScore}`,
    state: getLiveState(teamScore, opponentScore),
  };
}

function applyMatchResult(
  statsByTeam: Map<string, TeamStats>,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
): void {
  const home = statsByTeam.get(homeTeam) ?? createEmptyStats(homeTeam);
  const away = statsByTeam.get(awayTeam) ?? createEmptyStats(awayTeam);

  home.played += 1;
  away.played += 1;
  home.goalsFor += homeScore;
  home.goalsAgainst += awayScore;
  away.goalsFor += awayScore;
  away.goalsAgainst += homeScore;

  if (homeScore > awayScore) {
    home.won += 1;
    away.lost += 1;
  } else if (homeScore < awayScore) {
    home.lost += 1;
    away.won += 1;
  } else {
    home.drawn += 1;
    away.drawn += 1;
  }

  statsByTeam.set(homeTeam, home);
  statsByTeam.set(awayTeam, away);
}

function toStandingRow(stats: TeamStats): TeamStandingRow {
  return {
    teamName: stats.teamName,
    played: stats.played,
    won: stats.won,
    drawn: stats.drawn,
    lost: stats.lost,
    goalsFor: stats.goalsFor,
    goalsAgainst: stats.goalsAgainst,
    goalDifference: stats.goalsFor - stats.goalsAgainst,
    points: stats.won * 3 + stats.drawn,
  };
}

function compareStandingRows(a: TeamStandingRow, b: TeamStandingRow): number {
  if (b.points !== a.points) {
    return b.points - a.points;
  }

  if (b.goalDifference !== a.goalDifference) {
    return b.goalDifference - a.goalDifference;
  }

  if (b.goalsFor !== a.goalsFor) {
    return b.goalsFor - a.goalsFor;
  }

  return a.teamName.localeCompare(b.teamName);
}

export function buildGroupStandings(matches: Match[]): GroupStanding[] {
  const groupMatches = matches.filter(isGroupMatch);
  const groups = new Map<string, Map<string, TeamStats>>();
  const liveByGroup = new Map<string, Map<string, TeamStandingLive>>();

  for (const match of groupMatches) {
    const groupName = match.group_name!;
    const statsByTeam = groups.get(groupName) ?? new Map<string, TeamStats>();

    if (!statsByTeam.has(match.home_team_name)) {
      statsByTeam.set(
        match.home_team_name,
        createEmptyStats(match.home_team_name),
      );
    }

    if (!statsByTeam.has(match.away_team_name)) {
      statsByTeam.set(
        match.away_team_name,
        createEmptyStats(match.away_team_name),
      );
    }

    if (isScoredGroupMatch(match)) {
      applyMatchResult(
        statsByTeam,
        match.home_team_name,
        match.away_team_name,
        match.home_score!,
        match.away_score!,
      );
    }

    if (isLiveWithScore(match)) {
      const liveByTeam =
        liveByGroup.get(groupName) ?? new Map<string, TeamStandingLive>();

      liveByTeam.set(
        match.home_team_name,
        toLiveInfo(match.home_score!, match.away_score!),
      );
      liveByTeam.set(
        match.away_team_name,
        toLiveInfo(match.away_score!, match.home_score!),
      );

      liveByGroup.set(groupName, liveByTeam);
    }

    groups.set(groupName, statsByTeam);
  }

  return [...groups.entries()]
    .map(([groupName, statsByTeam]) => {
      const liveByTeam = liveByGroup.get(groupName);

      return {
        groupName,
        rows: [...statsByTeam.values()]
          .map((stats) => {
            const row = toStandingRow(stats);
            const live = liveByTeam?.get(stats.teamName);

            return live ? { ...row, live } : row;
          })
          .sort(compareStandingRows),
      };
    })
    .sort((a, b) => getGroupSortKey(a.groupName) - getGroupSortKey(b.groupName));
}
