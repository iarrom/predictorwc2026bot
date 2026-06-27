import { describe, expect, it } from "vitest";
import {
  outcomeFromScore,
  projectPredictionPoints,
  resolveScoredOutcome,
  scorePrediction,
} from "./scoring";

describe("scoring", () => {
  it("derives outcome from score", () => {
    expect(outcomeFromScore(2, 1)).toBe("home");
    expect(outcomeFromScore(0, 1)).toBe("away");
    expect(outcomeFromScore(1, 1)).toBe("draw");
  });

  it("awards one point for a correct pick", () => {
    expect(projectPredictionPoints("home", 2, 0)).toBe(1);
    expect(projectPredictionPoints("draw", 1, 1)).toBe(1);
    expect(projectPredictionPoints("away", 0, 2)).toBe(1);
    expect(projectPredictionPoints("home", 0, 2)).toBe(0);
  });

  it("uses winner for knockout scoring when set", () => {
    const match = {
      round_key: "quarter_final",
      home_score: 1,
      away_score: 1,
      winner: "home" as const,
    };

    expect(resolveScoredOutcome(match)).toBe("home");
    expect(scorePrediction("home", match)).toBe(1);
    expect(scorePrediction("draw", match)).toBe(0);
    expect(scorePrediction("away", match)).toBe(0);
  });

  it("falls back to full-time score for knockout without winner", () => {
    const match = {
      round_key: "semi_final",
      home_score: 2,
      away_score: 1,
      winner: null,
    };

    expect(resolveScoredOutcome(match)).toBe("home");
    expect(scorePrediction("home", match)).toBe(1);
  });

  it("uses score for group matches even when winner is set", () => {
    const match = {
      round_key: "group_1",
      home_score: 1,
      away_score: 1,
      winner: "home" as const,
    };

    expect(resolveScoredOutcome(match)).toBe("draw");
    expect(scorePrediction("draw", match)).toBe(1);
  });
});
