import type { Match } from "@/entities/match/model/types";

const REVEAL_DELAY_MS = 3 * 60 * 1000;

export function shouldRevealMatchPredictions(
  match: Pick<
    Match,
    "status" | "kickoff_at" | "minute" | "home_score" | "away_score"
  >,
  now = new Date(),
): boolean {
  if (match.status === "finished") {
    return match.home_score !== null && match.away_score !== null;
  }

  if (match.status !== "live") {
    return false;
  }

  if (match.home_score === null || match.away_score === null) {
    return false;
  }

  if (match.minute !== null && match.minute >= 3) {
    return true;
  }

  const kickoff = new Date(match.kickoff_at);
  return now.getTime() - kickoff.getTime() >= REVEAL_DELAY_MS;
}
