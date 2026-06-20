import { describe, expect, it } from "vitest";
import {
  buildTiebreakerStandings,
  getActualRoundGoals,
  isRoundComplete,
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

describe("isRoundComplete", () => {
  it("returns true when all matches in the round are finished", () => {
    expect(isRoundComplete(matches, "group_1")).toBe(true);
  });

  it("returns false when any match in the round is unfinished", () => {
    expect(isRoundComplete(matches, "group_2")).toBe(false);
  });

  it("returns false when the round has no matches", () => {
    expect(isRoundComplete(matches, "group_3")).toBe(false);
  });
});

describe("getActualRoundGoals", () => {
  it("sums goals from finished matches in the round", () => {
    expect(getActualRoundGoals(matches, "group_1")).toBe(3);
  });

  it("returns zero when no finished matches exist", () => {
    expect(getActualRoundGoals(matches, "group_2")).toBe(0);
  });
});

describe("buildTiebreakerStandings", () => {
  it("reveals completed rounds and computes deviations", () => {
    const standings = buildTiebreakerStandings({
      matches,
      profiles,
      decryptedRows: [
        { user_id: "user-a", round_key: "group_1", goals: 38 },
        { user_id: "user-b", round_key: "group_1", goals: 10 },
      ],
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

  it("hides round columns until all matches in the round are finished", () => {
    const inProgressMatches: MatchForStandings[] = [
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
        status: "scheduled",
        home_score: null,
        away_score: null,
      },
    ];

    const standings = buildTiebreakerStandings({
      matches: inProgressMatches,
      profiles,
      decryptedRows: [{ user_id: "user-a", round_key: "group_1", goals: 38 }],
    });

    expect(standings.revealedRounds.group_1).toBe(false);
    expect(standings.rows[0]?.perRound.group_1).toBeNull();
    expect(standings.rows[0]?.overall).toBeNull();
  });

  it("penalizes missing predictions with worst deviation in the round", () => {
    const standings = buildTiebreakerStandings({
      matches,
      profiles,
      decryptedRows: [
        { user_id: "user-b", round_key: "group_1", goals: 10 },
      ],
    });

    const alice = standings.rows.find((row) => row.userId === "user-a");
    const bob = standings.rows.find((row) => row.userId === "user-b");

    expect(alice?.perRound.group_1).toEqual({ prediction: null, deviation: 7 });
    expect(alice?.overall).toBe(7);
    expect(bob?.perRound.group_1).toEqual({ prediction: 10, deviation: 7 });
    expect(bob?.overall).toBe(7);
  });

  it("does not count in-progress rounds in overall", () => {
    const standings = buildTiebreakerStandings({
      matches,
      profiles,
      decryptedRows: [
        { user_id: "user-a", round_key: "group_1", goals: 10 },
        { user_id: "user-a", round_key: "group_2", goals: 100 },
        { user_id: "user-b", round_key: "group_1", goals: 10 },
      ],
    });

    const alice = standings.rows.find((row) => row.userId === "user-a");
    const bob = standings.rows.find((row) => row.userId === "user-b");

    expect(alice?.perRound.group_2).toBeNull();
    expect(alice?.overall).toBe(7);
    expect(bob?.overall).toBe(7);
  });
});
