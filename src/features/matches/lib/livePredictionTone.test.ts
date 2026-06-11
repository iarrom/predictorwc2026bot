import { describe, expect, it } from "vitest";
import {
  isPredictionOnTrack,
  livePredictionTextClass,
} from "./livePredictionTone";

describe("livePredictionTone", () => {
  it("detects on-track picks from current score", () => {
    expect(isPredictionOnTrack("home", 1, 0)).toBe(true);
    expect(isPredictionOnTrack("home", 0, 0)).toBe(false);
    expect(isPredictionOnTrack("draw", 0, 0)).toBe(true);
  });

  it("returns tone classes only during live", () => {
    expect(livePredictionTextClass(false, "home", 1, 0)).toBeUndefined();
    expect(livePredictionTextClass(true, "home", 1, 0)).toBe("text-emerald-300");
    expect(livePredictionTextClass(true, "home", 0, 1)).toBe("text-red-300/80");
  });
});
