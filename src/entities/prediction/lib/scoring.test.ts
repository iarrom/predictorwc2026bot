import { describe, expect, it } from "vitest";
import { outcomeFromScore, projectPredictionPoints } from "./scoring";

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
});
