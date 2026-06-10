export interface MatchVoterInfo {
  count: number;
}

export function buildVoterMap(
  predictions: { match_id: string }[],
): Map<string, MatchVoterInfo> {
  const voterMap = new Map<string, MatchVoterInfo>();

  for (const prediction of predictions) {
    const entry = voterMap.get(prediction.match_id) ?? { count: 0 };
    entry.count += 1;
    voterMap.set(prediction.match_id, entry);
  }

  return voterMap;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
