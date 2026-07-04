import type { Match } from "@/entities/match/model/types";
import {
  projectPredictionPoints,
  scorePrediction,
} from "@/entities/prediction/lib/scoring";
import type { PredictionOutcome } from "@/entities/prediction/model/types";
import type { LeaderboardOverallEntry } from "@/features/leaderboard/lib/buildAnalytics";
import { shouldRevealMatchPredictions } from "@/features/matches/lib/shouldRevealMatchPredictions";

export interface ResultsPrediction {
  user_id: string;
  match_id: string;
  outcome: PredictionOutcome;
  points_awarded: number | null;
}

export interface ResultsProfile {
  id: string;
  display_name: string;
  photo_url: string | null;
}

function resolvePredictionPoints(
  prediction: ResultsPrediction,
  match: Match,
): number {
  if (match.home_score === null || match.away_score === null) {
    return 0;
  }

  const scoringMatch = {
    round_key: match.round_key,
    home_score: match.home_score,
    away_score: match.away_score,
    winner: match.winner,
  };

  if (match.status === "finished") {
    return (
      prediction.points_awarded ?? scorePrediction(prediction.outcome, scoringMatch)
    );
  }

  if (match.status === "live") {
    return projectPredictionPoints(
      prediction.outcome,
      match.home_score,
      match.away_score,
      match.round_key,
    );
  }

  return 0;
}

function compareOverallRanked(
  a: {
    points: number;
    tiebreaker: number | null;
    picks: number;
    display_name: string;
  },
  b: {
    points: number;
    tiebreaker: number | null;
    picks: number;
    display_name: string;
  },
): number {
  if (b.points !== a.points) return b.points - a.points;

  const leftTiebreaker = a.tiebreaker;
  const rightTiebreaker = b.tiebreaker;

  if (leftTiebreaker === null && rightTiebreaker === null) {
    if (b.picks !== a.picks) return b.picks - a.picks;
    return a.display_name.localeCompare(b.display_name);
  }

  if (leftTiebreaker === null) return 1;
  if (rightTiebreaker === null) return -1;
  if (leftTiebreaker !== rightTiebreaker) {
    return leftTiebreaker - rightTiebreaker;
  }

  if (b.picks !== a.picks) return b.picks - a.picks;
  return a.display_name.localeCompare(b.display_name);
}

export function buildResultsStandings(input: {
  matches: Match[];
  predictions: ResultsPrediction[];
  profiles: ResultsProfile[];
  tiebreakerOverallByUser: Map<string, number | null>;
}): LeaderboardOverallEntry[] {
  const { matches, predictions, profiles, tiebreakerOverallByUser } = input;

  const matchMap = new Map(matches.map((match) => [match.id, match]));
  const revealableMatchIds = new Set(
    matches
      .filter((match) => shouldRevealMatchPredictions(match))
      .map((match) => match.id),
  );

  const playerMap = new Map(
    profiles.map((profile) => [
      profile.id,
      {
        user_id: profile.id,
        display_name: profile.display_name,
        photo_url: profile.photo_url,
        totalPoints: 0,
        totalPicks: 0,
      },
    ]),
  );

  for (const prediction of predictions) {
    const player = playerMap.get(prediction.user_id);
    if (!player) continue;

    player.totalPicks += 1;

    if (!revealableMatchIds.has(prediction.match_id)) continue;

    const match = matchMap.get(prediction.match_id);
    if (!match) continue;

    player.totalPoints += resolvePredictionPoints(prediction, match);
  }

  return [...playerMap.values()]
    .map((player) => ({
      user_id: player.user_id,
      display_name: player.display_name,
      photo_url: player.photo_url,
      total_points: player.totalPoints,
      predictions_count: player.totalPicks,
      tiebreaker_overall: tiebreakerOverallByUser.get(player.user_id) ?? null,
      rank: 0,
    }))
    .sort((a, b) =>
      compareOverallRanked(
        {
          points: a.total_points,
          tiebreaker: a.tiebreaker_overall,
          picks: a.predictions_count,
          display_name: a.display_name,
        },
        {
          points: b.total_points,
          tiebreaker: b.tiebreaker_overall,
          picks: b.predictions_count,
          display_name: b.display_name,
        },
      ),
    )
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

export function resolveResultsPredictionPoints(
  prediction: ResultsPrediction,
  match: Match,
): number | null {
  if (!shouldRevealMatchPredictions(match)) {
    return null;
  }

  if (match.home_score === null || match.away_score === null) {
    return null;
  }

  return resolvePredictionPoints(prediction, match);
}
