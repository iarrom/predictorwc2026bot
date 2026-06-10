export type MatchStatus = "scheduled" | "live" | "finished";

export type MatchEventType =
  | "goal"
  | "penalty"
  | "own_goal"
  | "yellow_card"
  | "red_card"
  | "yellow_red_card"
  | "substitution";

export type MatchEventSide = "home" | "away";

export interface LineupPlayer {
  id: number;
  name: string;
  position: string | null;
  shirtNumber: number | null;
}

export interface TeamLineup {
  formation: string | null;
  coach: string | null;
  lineup: LineupPlayer[];
  bench: LineupPlayer[];
}

export interface Match {
  id: string;
  external_key: string;
  round_key: string;
  round_display: string;
  group_name: string | null;
  match_number: number | null;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string;
  away_team_name: string;
  venue: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  fd_match_id: number | null;
  minute: number | null;
  injury_time: number | null;
  fd_status: string | null;
  fd_last_updated: string | null;
  home_lineup: TeamLineup | null;
  away_lineup: TeamLineup | null;
  created_at: string;
  updated_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  event_key: string;
  type: MatchEventType;
  minute: number;
  injury_time: number | null;
  side: MatchEventSide;
  player_name: string;
  secondary_player_name: string | null;
  score_home: number | null;
  score_away: number | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}
