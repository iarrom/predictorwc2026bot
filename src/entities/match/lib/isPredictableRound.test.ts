import { describe, expect, it } from "vitest";
import { isPredictableRound } from "@/entities/match/lib/isPredictableRound";

describe("isPredictableRound", () => {
  it("returns false for third_place", () => {
    expect(isPredictableRound("third_place")).toBe(false);
  });

  it("returns true for scoring rounds", () => {
    expect(isPredictableRound("final")).toBe(true);
    expect(isPredictableRound("semi_final")).toBe(true);
    expect(isPredictableRound("group_1")).toBe(true);
  });
});
