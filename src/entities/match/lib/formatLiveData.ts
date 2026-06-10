export function formatLiveMinute(
  minute: number | null,
  injuryTime: number | null,
): string | null {
  if (minute == null) return null;
  if (injuryTime != null && injuryTime > 0) {
    return `${minute}+${injuryTime}'`;
  }
  return `${minute}'`;
}

export function formatEventMinute(
  minute: number,
  injuryTime: number | null,
): string {
  if (injuryTime != null && injuryTime > 0) {
    return `${minute}+${injuryTime}'`;
  }
  return `${minute}'`;
}

export function formatEventTypeLabel(type: string): string {
  switch (type) {
    case "goal":
      return "Goal";
    case "penalty":
      return "Penalty";
    case "own_goal":
      return "Own goal";
    case "yellow_card":
      return "Yellow card";
    case "red_card":
      return "Red card";
    case "yellow_red_card":
      return "Second yellow";
    case "substitution":
      return "Substitution";
    default:
      return type;
  }
}
