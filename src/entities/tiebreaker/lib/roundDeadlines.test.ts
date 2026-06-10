import { describe, expect, it } from "vitest";
import {
  getTiebreakerRoundDeadline,
  getTiebreakerRoundMatchCount,
  isTiebreakerRoundLocked,
  matchBelongsToTiebreakerRound,
} from "@/entities/tiebreaker/lib/roundDeadlines";

const matches = [
  { round_key: "group_1", kickoff_at: "2026-06-12T18:00:00.000Z" },
  { round_key: "group_2", kickoff_at: "2026-06-15T18:00:00.000Z" },
  { round_key: "round_of_32", kickoff_at: "2026-07-01T18:00:00.000Z" },
  { round_key: "third_place", kickoff_at: "2026-07-18T18:00:00.000Z" },
  { round_key: "final", kickoff_at: "2026-07-19T18:00:00.000Z" },
];

describe("roundDeadlines", () => {
  it("maps group matchdays one-to-one", () => {
    expect(matchBelongsToTiebreakerRound("group_1", "group_1")).toBe(true);
    expect(matchBelongsToTiebreakerRound("group_2", "group_1")).toBe(false);
    expect(matchBelongsToTiebreakerRound("group_3", "group_3")).toBe(true);
  });

  it("maps playoffs to all non-group matches", () => {
    expect(matchBelongsToTiebreakerRound("round_of_32", "playoff")).toBe(true);
    expect(matchBelongsToTiebreakerRound("third_place", "playoff")).toBe(true);
    expect(matchBelongsToTiebreakerRound("final", "playoff")).toBe(true);
    expect(matchBelongsToTiebreakerRound("group_1", "playoff")).toBe(false);
  });

  it("counts matches in a tour", () => {
    expect(getTiebreakerRoundMatchCount(matches, "group_1")).toBe(1);
    expect(getTiebreakerRoundMatchCount(matches, "group_2")).toBe(1);
    expect(getTiebreakerRoundMatchCount(matches, "playoff")).toBe(3);
    expect(getTiebreakerRoundMatchCount(matches, "group_3")).toBe(0);
  });

  it("returns earliest kickoff for a tour", () => {
    expect(getTiebreakerRoundDeadline(matches, "group_1")).toBe(
      "2026-06-12T18:00:00.000Z",
    );
    expect(getTiebreakerRoundDeadline(matches, "playoff")).toBe(
      "2026-07-01T18:00:00.000Z",
    );
    expect(getTiebreakerRoundDeadline(matches, "group_3")).toBeNull();
  });

  it("locks a tour after its first kickoff", () => {
    expect(
      isTiebreakerRoundLocked(
        "2026-06-12T18:00:00.000Z",
        new Date("2026-06-12T18:00:01.000Z"),
      ),
    ).toBe(true);
    expect(
      isTiebreakerRoundLocked(
        "2026-06-12T18:00:00.000Z",
        new Date("2026-06-12T17:59:59.000Z"),
      ),
    ).toBe(false);
  });
});
