import { describe, expect, it } from "vitest";
import { resolveDisplayScore } from "./formatMatchScore";

describe("resolveDisplayScore", () => {
  it("returns stored score when no penalty shootout", () => {
    expect(
      resolveDisplayScore({
        home_score: 2,
        away_score: 1,
        home_penalties: null,
        away_penalties: null,
      }),
    ).toEqual({ home: 2, away: 1 });
  });

  it("returns stored score when already main-time only", () => {
    expect(
      resolveDisplayScore({
        home_score: 1,
        away_score: 1,
        home_penalties: 2,
        away_penalties: 4,
      }),
    ).toEqual({ home: 1, away: 1 });
  });

  it("strips shootout goals from polluted fullTime rows", () => {
    expect(
      resolveDisplayScore({
        home_score: 3,
        away_score: 5,
        home_penalties: 2,
        away_penalties: 4,
      }),
    ).toEqual({ home: 1, away: 1 });
  });
});
