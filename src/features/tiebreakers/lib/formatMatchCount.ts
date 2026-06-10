export function formatTiebreakerMatchCount(count: number): string {
  if (count === 0) {
    return "No matches scheduled";
  }

  return `${count} ${count === 1 ? "match" : "matches"}`;
}
