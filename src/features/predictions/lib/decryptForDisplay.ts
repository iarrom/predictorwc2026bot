import { decryptOutcome } from "@/shared/lib/predictions-crypto";
import type { PredictionOutcome } from "@/entities/prediction/model/types";

export function decryptPredictionForDisplay(
  outcomeEncrypted: string,
  userId: string,
  matchId: string,
): PredictionOutcome | null {
  try {
    return decryptOutcome(outcomeEncrypted, { userId, matchId });
  } catch (error) {
    console.error("Failed to decrypt prediction for display", {
      userId,
      matchId,
      error,
    });
    return null;
  }
}
