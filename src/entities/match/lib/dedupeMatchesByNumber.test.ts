import { describe, expect, it } from "vitest";
import { dedupeMatchesByNumber } from "@/entities/match/lib/dedupeMatchesByNumber";
import type { Match } from "@/entities/match/model/types";

function makeMatch(overrides: Partial<Match> & Pick<Match, "id" | "external_key" | "round_key">): Match {
  return {
    round_display: overrides.round_key,
    group_name: null,
    match_number: null,
    kickoff_at: "2026-07-19T15:00:00.000Z",
    home_team_id: null,
    away_team_id: null,
    home_team_name: "A",
    away_team_name: "B",
    venue: null,
    status: "scheduled",
    home_score: null,
    away_score: null,
    home_penalties: null,
    away_penalties: null,
    winner: null,
    minute: null,
    injury_time: null,
    home_lineup: null,
    away_lineup: null,
    fd_match_id: null,
    fd_status: null,
    fd_last_updated: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("dedupeMatchesByNumber", () => {
  it("prefers wc2026-{num} external_key when match_number duplicates exist", () => {
    const canonical = makeMatch({
      id: "canonical",
      external_key: "wc2026-104",
      match_number: 104,
      round_key: "final",
      updated_at: "2026-01-02T00:00:00.000Z",
    });
    const orphan = makeMatch({
      id: "orphan",
      external_key: "wc2026-2026-07-19-W101-W102",
      match_number: 104,
      round_key: "final",
      updated_at: "2026-01-03T00:00:00.000Z",
    });

    const result = dedupeMatchesByNumber([orphan, canonical]);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("canonical");
  });

  it("drops null-number final/third_place rows when numbered canonical exists", () => {
    const canonical = makeMatch({
      id: "third-canonical",
      external_key: "wc2026-103",
      match_number: 103,
      round_key: "third_place",
      kickoff_at: "2026-07-18T17:00:00.000Z",
    });
    const orphan = makeMatch({
      id: "third-orphan",
      external_key: "wc2026-2026-07-18-L101-L102",
      round_key: "third_place",
      kickoff_at: "2026-07-18T17:00:00.000Z",
    });

    const result = dedupeMatchesByNumber([orphan, canonical]);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("third-canonical");
  });
});
