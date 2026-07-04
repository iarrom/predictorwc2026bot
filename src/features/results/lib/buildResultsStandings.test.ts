import { describe, expect, it } from "vitest";
import type { Match } from "@/entities/match/model/types";
import { buildResultsStandings } from "@/features/results/lib/buildResultsStandings";

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "match-1",
    external_key: "m1",
    round_key: "group_1",
    round_display: "Group",
    group_name: "A",
    match_number: 1,
    kickoff_at: "2026-06-01T12:00:00.000Z",
    home_team_id: null,
    away_team_id: null,
    home_team_name: "Team A",
    away_team_name: "Team B",
    venue: null,
    status: "finished",
    home_score: 2,
    away_score: 1,
    winner: "home",
    home_penalties: null,
    away_penalties: null,
    fd_match_id: null,
    minute: null,
    injury_time: null,
    fd_status: null,
    fd_last_updated: null,
    home_lineup: null,
    away_lineup: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildResultsStandings", () => {
  it("awards points for finished matches and ranks by total", () => {
    const match = makeMatch();

    const overall = buildResultsStandings({
      matches: [match],
      predictions: [
        {
          user_id: "user-a",
          match_id: match.id,
          outcome: "home",
          points_awarded: 1,
        },
        {
          user_id: "user-b",
          match_id: match.id,
          outcome: "away",
          points_awarded: 0,
        },
      ],
      profiles: [
        { id: "user-a", display_name: "Alice", photo_url: null },
        { id: "user-b", display_name: "Bob", photo_url: null },
      ],
      tiebreakerOverallByUser: new Map([
        ["user-a", 5],
        ["user-b", 2],
      ]),
    });

    expect(overall[0]?.user_id).toBe("user-a");
    expect(overall[0]?.total_points).toBe(1);
    expect(overall[0]?.rank).toBe(1);
    expect(overall[1]?.total_points).toBe(0);
  });

  it("does not award points before predictions are revealed", () => {
    const match = makeMatch({
      status: "scheduled",
      home_score: null,
      away_score: null,
      winner: null,
    });

    const overall = buildResultsStandings({
      matches: [match],
      predictions: [
        {
          user_id: "user-a",
          match_id: match.id,
          outcome: "home",
          points_awarded: null,
        },
      ],
      profiles: [{ id: "user-a", display_name: "Alice", photo_url: null }],
      tiebreakerOverallByUser: new Map(),
    });

    expect(overall[0]?.total_points).toBe(0);
    expect(overall[0]?.predictions_count).toBe(1);
  });
});
