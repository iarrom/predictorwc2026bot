/**
 * Knockout / bracket placeholder labels from OpenFootball, e.g. 1F, W74, 3A/B/C/D/F.
 */
export function isPlaceholderTeam(name: string): boolean {
  if (/^[WL]?\d+[A-L]?$/.test(name)) return true;
  if (/^\d[A-L]$/.test(name)) return true;
  if (/^[WL]?\d+[A-Z](?:\/[A-Z])*$/.test(name)) return true;
  return false;
}

/** Do not replace a resolved team name with a placeholder from upstream. */
export function resolveTeamName(currentName: string, incomingName: string): string {
  if (!isPlaceholderTeam(currentName) && isPlaceholderTeam(incomingName)) {
    return currentName;
  }
  return incomingName;
}
