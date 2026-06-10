import type { PredictionOutcome } from "@/entities/prediction/model/types";

export function formatOutcomeShort(outcome: PredictionOutcome): string {
  switch (outcome) {
    case "home":
      return "1";
    case "draw":
      return "X";
    case "away":
      return "2";
  }
}

export function formatOutcomeLabel(
  outcome: PredictionOutcome,
  homeTeamName?: string,
  awayTeamName?: string,
): string {
  switch (outcome) {
    case "home":
      return homeTeamName ? `1 · ${homeTeamName}` : "1";
    case "draw":
      return "X · Draw";
    case "away":
      return awayTeamName ? `2 · ${awayTeamName}` : "2";
  }
}

export function getActualOutcome(
  homeScore: number,
  awayScore: number,
): PredictionOutcome {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}
