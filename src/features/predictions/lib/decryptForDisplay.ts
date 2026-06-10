import { decryptOutcome } from "@/shared/lib/predictions-crypto";
import type { PredictionOutcome } from "@/entities/prediction/model/types";

export function decryptPredictionForDisplay(
  outcomeEncrypted: string,
  userId: string,
  matchId: string,
): PredictionOutcome {
  return decryptOutcome(outcomeEncrypted, { userId, matchId });
}
