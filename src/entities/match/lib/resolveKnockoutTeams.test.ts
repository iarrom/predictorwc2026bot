import { describe, expect, it } from "vitest";
import {
  parseWinnerLoserPlaceholder,
  resolveKnockoutTeamPatches,
  type KnockoutMatchForResolve,
} from "./resolveKnockoutTeams";

function match(
  overrides: Partial<KnockoutMatchForResolve> & Pick<KnockoutMatchForResolve, "id" | "match_number">,
): KnockoutMatchForResolve {
  return {
    status: "scheduled",
    winner: null,
    home_team_id: null,
    away_team_id: null,
    home_team_name: "TBD",
    away_team_name: "TBD",
    ...overrides,
  };
}

describe("parseWinnerLoserPlaceholder", () => {
  it("parses winner references", () => {
    expect(parseWinnerLoserPlaceholder("W86")).toEqual({
      type: "W",
      matchNumber: 86,
    });
  });

  it("parses loser references", () => {
    expect(parseWinnerLoserPlaceholder("L101")).toEqual({
      type: "L",
      matchNumber: 101,
    });
  });

  it("returns null for group placeholders", () => {
    expect(parseWinnerLoserPlaceholder("1F")).toBeNull();
    expect(parseWinnerLoserPlaceholder("3A/B/C/D/F")).toBeNull();
  });
});

describe("resolveKnockoutTeamPatches", () => {
  it("resolves W placeholders from finished parent matches", () => {
    const matches: KnockoutMatchForResolve[] = [
      match({
        id: "m86",
        match_number: 86,
        status: "finished",
        winner: "home",
        home_team_id: "arg-id",
        away_team_id: "cv-id",
        home_team_name: "Argentina",
        away_team_name: "Cape Verde",
      }),
      match({
        id: "m88",
        match_number: 88,
        status: "finished",
        winner: "away",
        home_team_id: "aus-id",
        away_team_id: "egy-id",
        home_team_name: "Australia",
        away_team_name: "Egypt",
      }),
      match({
        id: "m95",
        match_number: 95,
        home_team_name: "W86",
        away_team_name: "W88",
      }),
    ];

    const patches = resolveKnockoutTeamPatches(matches);

    expect(patches).toEqual([
      {
        id: "m95",
        home_team_name: "Argentina",
        home_team_id: "arg-id",
        away_team_name: "Egypt",
        away_team_id: "egy-id",
      },
    ]);
  });

  it("resolves L placeholders to the losing side", () => {
    const matches: KnockoutMatchForResolve[] = [
      match({
        id: "m101",
        match_number: 101,
        status: "finished",
        winner: "home",
        home_team_id: "a-id",
        away_team_id: "b-id",
        home_team_name: "Team A",
        away_team_name: "Team B",
      }),
      match({
        id: "m103",
        match_number: 103,
        home_team_name: "L101",
        away_team_name: "L102",
      }),
    ];

    const patches = resolveKnockoutTeamPatches(matches);

    expect(patches).toEqual([
      {
        id: "m103",
        home_team_name: "Team B",
        home_team_id: "b-id",
      },
    ]);
  });

  it("skips resolution when parent match is not finished", () => {
    const matches: KnockoutMatchForResolve[] = [
      match({
        id: "m86",
        match_number: 86,
        status: "scheduled",
        home_team_name: "Argentina",
        away_team_name: "Cape Verde",
      }),
      match({
        id: "m95",
        match_number: 95,
        home_team_name: "W86",
        away_team_name: "W88",
      }),
    ];

    expect(resolveKnockoutTeamPatches(matches)).toEqual([]);
  });

  it("resolves multiple R16 slots from finished R32 parents in one pass", () => {
    const matches: KnockoutMatchForResolve[] = [
      match({
        id: "m86",
        match_number: 86,
        status: "finished",
        winner: "home",
        home_team_id: "arg-id",
        away_team_id: "cv-id",
        home_team_name: "Argentina",
        away_team_name: "Cape Verde",
      }),
      match({
        id: "m87",
        match_number: 87,
        status: "finished",
        winner: "home",
        home_team_id: "col-id",
        away_team_id: "gha-id",
        home_team_name: "Colombia",
        away_team_name: "Ghana",
      }),
      match({
        id: "m88",
        match_number: 88,
        status: "finished",
        winner: "away",
        home_team_id: "aus-id",
        away_team_id: "egy-id",
        home_team_name: "Australia",
        away_team_name: "Egypt",
      }),
      match({
        id: "m95",
        match_number: 95,
        home_team_name: "W86",
        away_team_name: "W88",
      }),
      match({
        id: "m96",
        match_number: 96,
        home_team_id: "sui-id",
        home_team_name: "Switzerland",
        away_team_name: "W87",
      }),
    ];

    const patches = resolveKnockoutTeamPatches(matches);

    expect(patches).toEqual([
      {
        id: "m95",
        home_team_name: "Argentina",
        home_team_id: "arg-id",
        away_team_name: "Egypt",
        away_team_id: "egy-id",
      },
      {
        id: "m96",
        away_team_name: "Colombia",
        away_team_id: "col-id",
      },
    ]);
  });

  it("leaves real team names unchanged", () => {
    const matches: KnockoutMatchForResolve[] = [
      match({
        id: "m89",
        match_number: 89,
        home_team_name: "Paraguay",
        away_team_name: "France",
        home_team_id: "py-id",
        away_team_id: "fr-id",
      }),
    ];

    expect(resolveKnockoutTeamPatches(matches)).toEqual([]);
  });

  it("returns empty when parent match is missing", () => {
    const matches: KnockoutMatchForResolve[] = [
      match({
        id: "m95",
        match_number: 95,
        home_team_name: "W999",
        away_team_name: "W998",
      }),
    ];

    expect(resolveKnockoutTeamPatches(matches)).toEqual([]);
  });
});
