import { describe, expect, it } from "vitest";
import { isPlaceholderTeam, resolveTeamName } from "./isPlaceholderTeam";

describe("isPlaceholderTeam", () => {
  it("detects group-position placeholders", () => {
    expect(isPlaceholderTeam("1F")).toBe(true);
    expect(isPlaceholderTeam("2C")).toBe(true);
    expect(isPlaceholderTeam("1I")).toBe(true);
  });

  it("detects winner/loser match references", () => {
    expect(isPlaceholderTeam("W74")).toBe(true);
    expect(isPlaceholderTeam("L101")).toBe(true);
  });

  it("detects best-third-place slash combinations", () => {
    expect(isPlaceholderTeam("3A/B/C/D/F")).toBe(true);
    expect(isPlaceholderTeam("3C/D/F/G/H")).toBe(true);
    expect(isPlaceholderTeam("3C/E/F/H/I")).toBe(true);
  });

  it("returns false for real team names", () => {
    expect(isPlaceholderTeam("Netherlands")).toBe(false);
    expect(isPlaceholderTeam("Bosnia & Herzegovina")).toBe(false);
    expect(isPlaceholderTeam("USA")).toBe(false);
  });
});

describe("resolveTeamName", () => {
  it("keeps resolved names when upstream still sends placeholders", () => {
    expect(resolveTeamName("Netherlands", "1F")).toBe("Netherlands");
    expect(resolveTeamName("W74", "Morocco")).toBe("Morocco");
  });
});
