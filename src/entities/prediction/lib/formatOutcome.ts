import type { PredictionOutcome } from "@/entities/prediction/model/types";

export interface OutcomeMessages {
  draw: string;
  homeWins: (team: string) => string;
  awayWins: (team: string) => string;
  drawShort?: string;
  homeShort?: (team: string) => string;
  awayShort?: (team: string) => string;
}

const defaultMessages: OutcomeMessages = {
  draw: "Draw",
  homeWins: (team) => `${team} wins`,
  awayWins: (team) => `${team} wins`,
  drawShort: "X · Draw",
  homeShort: (team) => `1 · ${team}`,
  awayShort: (team) => `2 · ${team}`,
};

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
  messages: OutcomeMessages = defaultMessages,
): string {
  switch (outcome) {
    case "home":
      return homeTeamName
        ? (messages.homeShort?.(homeTeamName) ?? `1 · ${homeTeamName}`)
        : "1";
    case "draw":
      return messages.drawShort ?? messages.draw;
    case "away":
      return awayTeamName
        ? (messages.awayShort?.(awayTeamName) ?? `2 · ${awayTeamName}`)
        : "2";
  }
}

export function formatOutcomeWins(
  outcome: PredictionOutcome,
  homeTeamName: string,
  awayTeamName: string,
  messages: OutcomeMessages = defaultMessages,
): string {
  switch (outcome) {
    case "home":
      return messages.homeWins(homeTeamName);
    case "draw":
      return messages.draw;
    case "away":
      return messages.awayWins(awayTeamName);
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
