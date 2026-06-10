import { describe, expect, it } from "vitest";
import { buildLeaderboardAnalytics } from "@/features/leaderboard/lib/buildAnalytics";

const profiles = [
  { id: "user-a", display_name: "Alice", photo_url: null },
  { id: "user-b", display_name: "Bob", photo_url: null },
];

const matches = [
  {
    id: "match-g1-1",
    round_key: "group_1",
    status: "finished",
    home_score: 2,
    away_score: 1,
  },
  {
    id: "match-g1-2",
    round_key: "group_1",
    status: "finished",
    home_score: 0,
    away_score: 0,
  },
  {
    id: "match-g2-1",
    round_key: "group_2",
    status: "finished",
    home_score: 1,
    away_score: 0,
  },
  {
    id: "match-g2-2",
    round_key: "group_2",
    status: "finished",
    home_score: 0,
    away_score: 1,
  },
  {
    id: "match-g2-live",
    round_key: "group_2",
    status: "live",
    home_score: 1,
    away_score: 0,
  },
];

describe("buildLeaderboardAnalytics", () => {
  it("ranks players by total points and per-stage performance", () => {
    const analytics = buildLeaderboardAnalytics({
      matches,
      profiles,
      predictions: [
        { user_id: "user-a", match_id: "match-g1-1", outcome: "home" },
        { user_id: "user-a", match_id: "match-g1-2", outcome: "draw" },
        { user_id: "user-a", match_id: "match-g2-1", outcome: "away" },
        { user_id: "user-b", match_id: "match-g1-1", outcome: "away" },
        { user_id: "user-b", match_id: "match-g1-2", outcome: "draw" },
        { user_id: "user-b", match_id: "match-g2-1", outcome: "home" },
        { user_id: "user-b", match_id: "match-g2-live", outcome: "home" },
      ],
    });

    expect(analytics.stages).toEqual(["group_1", "group_2"]);
    expect(analytics.overall.map((entry) => entry.user_id)).toEqual([
      "user-b",
      "user-a",
    ]);
    expect(analytics.overall[0]).toMatchObject({
      user_id: "user-b",
      total_points: 2,
      predictions_count: 4,
      rank: 1,
    });
    expect(analytics.overall[1]).toMatchObject({
      user_id: "user-a",
      total_points: 2,
      predictions_count: 3,
      rank: 2,
    });

    expect(analytics.perStage.group_1?.[0]).toMatchObject({
      user_id: "user-a",
      points: 2,
      picks: 2,
      tiebreaker_deviation: null,
      rank: 1,
    });
    expect(analytics.perStage.group_1?.[1]).toMatchObject({
      user_id: "user-b",
      points: 1,
      picks: 2,
      rank: 2,
    });
    expect(analytics.perStage.group_2?.[0]).toMatchObject({
      user_id: "user-b",
      points: 1,
      picks: 1,
      rank: 1,
    });
    expect(analytics.perStage.group_2?.[1]).toMatchObject({
      user_id: "user-a",
      points: 0,
      picks: 1,
      rank: 2,
    });
  });

  it("uses tiebreaker deviation as secondary sort when points are tied", () => {
    const analytics = buildLeaderboardAnalytics({
      matches,
      profiles,
      predictions: [
        { user_id: "user-a", match_id: "match-g1-1", outcome: "home" },
        { user_id: "user-b", match_id: "match-g1-2", outcome: "draw" },
      ],
      tiebreakerOverallByUser: new Map([
        ["user-a", 12],
        ["user-b", 5],
      ]),
    });

    expect(analytics.overall.map((entry) => entry.user_id)).toEqual([
      "user-b",
      "user-a",
    ]);
    expect(analytics.overall[0]).toMatchObject({
      user_id: "user-b",
      total_points: 1,
      tiebreaker_overall: 5,
      rank: 1,
    });
    expect(analytics.overall[1]).toMatchObject({
      user_id: "user-a",
      total_points: 1,
      tiebreaker_overall: 12,
      rank: 2,
    });
  });

  it("falls back to picks when tiebreaker is unavailable", () => {
    const analytics = buildLeaderboardAnalytics({
      matches,
      profiles,
      predictions: [
        { user_id: "user-a", match_id: "match-g1-1", outcome: "home" },
        { user_id: "user-a", match_id: "match-g1-2", outcome: "draw" },
        { user_id: "user-b", match_id: "match-g1-1", outcome: "away" },
        { user_id: "user-b", match_id: "match-g1-2", outcome: "draw" },
        { user_id: "user-b", match_id: "match-g2-1", outcome: "home" },
      ],
      tiebreakerOverallByUser: new Map([
        ["user-a", null],
        ["user-b", null],
      ]),
    });

    expect(analytics.overall.map((entry) => entry.user_id)).toEqual([
      "user-b",
      "user-a",
    ]);
  });

  it("tracks position changes across stages", () => {
    const analytics = buildLeaderboardAnalytics({
      matches,
      profiles,
      predictions: [
        { user_id: "user-a", match_id: "match-g1-1", outcome: "home" },
        { user_id: "user-a", match_id: "match-g1-2", outcome: "draw" },
        { user_id: "user-a", match_id: "match-g2-1", outcome: "away" },
        { user_id: "user-b", match_id: "match-g1-1", outcome: "away" },
        { user_id: "user-b", match_id: "match-g1-2", outcome: "draw" },
        { user_id: "user-b", match_id: "match-g2-1", outcome: "home" },
        { user_id: "user-b", match_id: "match-g2-2", outcome: "away" },
      ],
    });

    expect(analytics.positionSeries["user-a"]).toEqual([
      {
        stageKey: "group_1",
        cumulativePoints: 2,
        position: 1,
      },
      {
        stageKey: "group_2",
        cumulativePoints: 2,
        position: 2,
      },
    ]);
    expect(analytics.positionSeries["user-b"]).toEqual([
      {
        stageKey: "group_1",
        cumulativePoints: 1,
        position: 2,
      },
      {
        stageKey: "group_2",
        cumulativePoints: 3,
        position: 1,
      },
    ]);
  });
});
