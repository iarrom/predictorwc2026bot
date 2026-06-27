/** Knockout / playoff rounds use round_key values other than group_* (e.g. round_of_16, final). */
export function isKnockoutRound(roundKey: string): boolean {
  return !roundKey.startsWith("group_");
}
