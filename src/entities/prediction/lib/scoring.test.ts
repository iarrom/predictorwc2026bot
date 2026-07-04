import { describe, expect, it } from "vitest";
import {
  outcomeFromScore,
  pointsForRound,
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

  it("maps round keys to point values", () => {
    expect(pointsForRound("group_1")).toBe(1);
    expect(pointsForRound("round_of_32")).toBe(2);
    expect(pointsForRound("round_of_16")).toBe(3);
    expect(pointsForRound("quarter_final")).toBe(4);
    expect(pointsForRound("semi_final")).toBe(5);
    expect(pointsForRound("final")).toBe(6);
    expect(pointsForRound("third_place")).toBe(0);
  });

  it("awards group-stage points for a correct live projection", () => {
    expect(projectPredictionPoints("home", 2, 0, "group_1")).toBe(1);
    expect(projectPredictionPoints("draw", 1, 1, "group_2")).toBe(1);
    expect(projectPredictionPoints("away", 0, 2, "group_3")).toBe(1);
    expect(projectPredictionPoints("home", 0, 2, "group_1")).toBe(0);
  });

  it("awards playoff points for a correct live projection", () => {
    expect(projectPredictionPoints("away", 0, 1, "round_of_32")).toBe(2);
    expect(projectPredictionPoints("home", 2, 0, "round_of_16")).toBe(3);
    expect(projectPredictionPoints("home", 1, 0, "final")).toBe(6);
    expect(projectPredictionPoints("home", 1, 0, "third_place")).toBe(0);
  });

  it("uses winner for knockout scoring when set", () => {
    const match = {
      round_key: "quarter_final",
      home_score: 1,
      away_score: 1,
      winner: "home" as const,
    };

    expect(resolveScoredOutcome(match)).toBe("home");
    expect(scorePrediction("home", match)).toBe(4);
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
    expect(scorePrediction("home", match)).toBe(5);
  });

  it("leaves drawn knockout without winner unresolved (shootout pending)", () => {
    const match = {
      round_key: "round_of_32",
      home_score: 1,
      away_score: 1,
      winner: null,
    };

    expect(resolveScoredOutcome(match)).toBeNull();
    expect(scorePrediction("home", match)).toBe(0);
    expect(scorePrediction("away", match)).toBe(0);
    expect(scorePrediction("draw", match)).toBe(0);
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

  it("awards two points for round of 32", () => {
    const match = {
      round_key: "round_of_32",
      home_score: 0,
      away_score: 1,
      winner: "away" as const,
    };

    expect(scorePrediction("away", match)).toBe(2);
    expect(scorePrediction("home", match)).toBe(0);
  });
});
