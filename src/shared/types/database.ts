export type UserRole = "guest" | "participant" | "admin";
export type PredictionOutcome = "home" | "draw" | "away";
export type PlayerPosition = "GK" | "DF" | "MF" | "FW";
export type MatchStatus = "scheduled" | "live" | "finished";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          telegram_id: number | null;
          photo_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          telegram_id?: number | null;
          photo_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          primary_color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          primary_color?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      matches: {
        Row: {
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
        };
        Insert: {
          id?: string;
          external_key: string;
          round_key: string;
          round_display: string;
          group_name?: string | null;
          match_number?: number | null;
          kickoff_at: string;
          home_team_id?: string | null;
          away_team_id?: string | null;
          home_team_name: string;
          away_team_name: string;
          venue?: string | null;
          status?: MatchStatus;
          home_score?: number | null;
          away_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          position: PlayerPosition | null;
          shirt_number: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          position?: PlayerPosition | null;
          shirt_number?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [];
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          round_key: string;
          outcome: PredictionOutcome;
          tiebreaker_value: number | null;
          points_awarded: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          round_key: string;
          outcome: PredictionOutcome;
          tiebreaker_value?: number | null;
          points_awarded?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["predictions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      leaderboard_base: {
        Row: {
          user_id: string;
          display_name: string;
          predictions_count: number;
          total_points: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_participant: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
