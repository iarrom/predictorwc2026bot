import { getOnsideCode } from "@/shared/lib/onside/codes";

/** FIFA 3-letter ticker for a team name (e.g. Brazil → BRA); falls back to first 3 letters. */
export function getTeamTicker(teamName: string): string {
  const code = getOnsideCode(teamName);
  if (code) return code.toUpperCase();

  return teamName.trim().slice(0, 3).toUpperCase();
}
