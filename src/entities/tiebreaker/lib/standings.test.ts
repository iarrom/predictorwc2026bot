import { describe, expect, it } from "vitest";
import {
  buildTiebreakerStandings,
  getActualRoundGoals,
  type MatchForStandings,
} from "@/entities/tiebreaker/lib/standings";

const matches: MatchForStandings[] = [
  {
    round_key: "group_1",
    kickoff_at: "2026-06-12T18:00:00.000Z",
    status: "finished",
    home_score: 2,
    away_score: 1,
  },
  {
    round_key: "group_1",
    kickoff_at: "2026-06-12T20:00:00.000Z",
    status: "finished",
    home_score: 0,
    away_score: 0,
  },
  {
    round_key: "group_2",
    kickoff_at: "2026-06-15T18:00:00.000Z",
    status: "scheduled",
    home_score: null,
    away_score: null,
  },
];

const profiles = [
  { id: "user-a", display_name: "Alice", photo_url: null },
  { id: "user-b", display_name: "Bob", photo_url: null },
];

describe("getActualRoundGoals", () => {
  it("sums goals from finished matches in the round", () => {
    expect(getActualRoundGoals(matches, "group_1")).toBe(3);
  });

  it("returns zero when no finished matches exist", () => {
    expect(getActualRoundGoals(matches, "group_2")).toBe(0);
  });
});

describe("buildTiebreakerStandings", () => {
  it("reveals locked rounds and computes deviations", () => {
    const standings = buildTiebreakerStandings({
      matches,
      profiles,
      decryptedRows: [
        { user_id: "user-a", round_key: "group_1", goals: 38 },
        { user_id: "user-b", round_key: "group_1", goals: 10 },
      ],
      now: new Date("2026-06-13T00:00:00.000Z"),
    });

    expect(standings.revealedRounds.group_1).toBe(true);
    expect(standings.revealedRounds.group_2).toBe(false);
    expect(standings.actualGoalsByRound.group_1).toBe(3);

    const alice = standings.rows.find((row) => row.userId === "user-a");
    const bob = standings.rows.find((row) => row.userId === "user-b");

    expect(alice?.perRound.group_1).toEqual({ prediction: 38, deviation: 35 });
    expect(bob?.perRound.group_1).toEqual({ prediction: 10, deviation: 7 });
    expect(alice?.overall).toBe(35);
    expect(bob?.overall).toBe(7);
    expect(standings.rows[0]?.userId).toBe("user-b");
  });

  it("hides round columns before first kickoff", () => {
    const standings = buildTiebreakerStandings({
      matches,
      profiles,
      decryptedRows: [
        { user_id: "user-a", round_key: "group_1", goals: 38 },
      ],
      now: new Date("2026-06-12T17:00:00.000Z"),
    });

    expect(standings.revealedRounds.group_1).toBe(false);
    expect(standings.rows[0]?.perRound.group_1).toBeNull();
    expect(standings.rows[0]?.overall).toBeNull();
  });

  it("omits missing predictions from overall", () => {
    const standings = buildTiebreakerStandings({
      matches,
      profiles: [{ id: "user-a", display_name: "Alice", photo_url: null }],
      decryptedRows: [],
      now: new Date("2026-06-13T00:00:00.000Z"),
    });

    expect(standings.rows[0]?.perRound.group_1).toBeNull();
    expect(standings.rows[0]?.overall).toBeNull();
  });
});
