import { describe, expect, it } from "vitest";
import { shouldRevealMatchPredictions } from "./shouldRevealMatchPredictions";

const base = {
  kickoff_at: "2026-06-12T00:00:00.000Z",
  home_score: 0,
  away_score: 0,
} as const;

describe("shouldRevealMatchPredictions", () => {
  it("returns false for scheduled matches", () => {
    expect(
      shouldRevealMatchPredictions({
        ...base,
        status: "scheduled",
        minute: null,
      }),
    ).toBe(false);
  });

  it("returns false for live matches under 3 minutes", () => {
    expect(
      shouldRevealMatchPredictions(
        {
          ...base,
          status: "live",
          minute: 2,
        },
        new Date("2026-06-12T00:02:00.000Z"),
      ),
    ).toBe(false);
  });

  it("returns true for live matches at minute 3+", () => {
    expect(
      shouldRevealMatchPredictions({
        ...base,
        status: "live",
        minute: 3,
      }),
    ).toBe(true);
  });

  it("falls back to kickoff + 3 minutes when minute is missing", () => {
    expect(
      shouldRevealMatchPredictions(
        {
          ...base,
          status: "live",
          minute: null,
        },
        new Date("2026-06-12T00:03:30.000Z"),
      ),
    ).toBe(true);
  });

  it("returns true for finished matches with a score", () => {
    expect(
      shouldRevealMatchPredictions({
        ...base,
        status: "finished",
        minute: 90,
      }),
    ).toBe(true);
  });
});
