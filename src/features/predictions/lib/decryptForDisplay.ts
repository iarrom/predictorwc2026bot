import { decryptOutcome } from "@/shared/lib/predictions-crypto";
import type { PredictionOutcome } from "@/entities/prediction/model/types";

export function isMatchLocked(kickoffAt: string, now = new Date()): boolean {
  return new Date(kickoffAt) <= now;
}

export function shouldRevealOutcome(
  predictionUserId: string,
  currentUserId: string | null,
  kickoffAt: string | undefined,
  now = new Date(),
): boolean {
  if (currentUserId && predictionUserId === currentUserId) {
    return true;
  }

  if (!kickoffAt) {
    return false;
  }

  return isMatchLocked(kickoffAt, now);
}

export function decryptPredictionForDisplay(
  outcomeEncrypted: string,
  userId: string,
  matchId: string,
): PredictionOutcome {
  return decryptOutcome(outcomeEncrypted, { userId, matchId });
}
