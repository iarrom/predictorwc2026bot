export type MatchStatus = "scheduled" | "live" | "finished";

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
  created_at: string;
  updated_at: string;
}
