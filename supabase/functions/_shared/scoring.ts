export type PredictionOutcome = "home" | "draw" | "away";

export interface MatchForScoring {
  round_key: string;
  home_score: number | null;
  away_score: number | null;
  winner: PredictionOutcome | null;
}

const POINTS_BY_ROUND: Record<string, number> = {
  group_1: 1,
  group_2: 1,
  group_3: 1,
  round_of_32: 2,
  round_of_16: 3,
  quarter_final: 4,
  semi_final: 5,
  final: 6,
  third_place: 0,
};

function isKnockoutRound(roundKey: string): boolean {
  return !roundKey.startsWith("group_");
}

export function outcomeFromScore(
  homeScore: number,
  awayScore: number,
): PredictionOutcome {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export function pointsForRound(roundKey: string): number {
  return POINTS_BY_ROUND[roundKey] ?? 1;
}

export function resolveScoredOutcome(
  match: MatchForScoring,
): PredictionOutcome | null {
  if (match.home_score === null || match.away_score === null) {
    return null;
  }

  if (isKnockoutRound(match.round_key) && match.winner) {
    return match.winner;
  }

  return outcomeFromScore(match.home_score, match.away_score);
}

export function scorePrediction(
  predicted: PredictionOutcome,
  match: MatchForScoring,
): number {
  const actual = resolveScoredOutcome(match);
  if (!actual) return 0;
  return predicted === actual ? pointsForRound(match.round_key) : 0;
}
