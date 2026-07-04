export function formatMatchScore(home: number, away: number): string {
  return `${home}:${away}`;
}

export function hasPenaltyShootout(match: {
  home_penalties: number | null;
  away_penalties: number | null;
}): boolean {
  return match.home_penalties !== null && match.away_penalties !== null;
}

/** Main-time score for display; strips shootout goals from polluted fullTime rows. */
export function resolveDisplayScore(match: {
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
}): { home: number; away: number } {
  const home = match.home_score ?? 0;
  const away = match.away_score ?? 0;

  if (
    !hasPenaltyShootout(match) ||
    match.home_score === null ||
    match.away_score === null
  ) {
    return { home, away };
  }

  const penHome = match.home_penalties!;
  const penAway = match.away_penalties!;

  if (home >= penHome && away >= penAway) {
    return { home: home - penHome, away: away - penAway };
  }

  return { home, away };
}
