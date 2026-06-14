"use server";

import { getOnsideCode } from "@/shared/lib/onside/codes";
import { compareTeams } from "@/shared/lib/onside/client";
import type { TeamCompare } from "@/shared/lib/onside/types";

export type MatchModel = TeamCompare;

export async function loadMatchModel(
  homeName: string,
  awayName: string,
): Promise<MatchModel | null> {
  const homeCode = getOnsideCode(homeName);
  const awayCode = getOnsideCode(awayName);

  if (!homeCode || !awayCode) {
    return null;
  }

  return compareTeams(homeCode, awayCode);
}
