export interface MatchCountMessages {
  none: string;
  one: (count: number) => string;
  other: (count: number) => string;
}

const defaultMessages: MatchCountMessages = {
  none: "No matches scheduled",
  one: (count) => `${count} match`,
  other: (count) => `${count} matches`,
};

export function formatTiebreakerMatchCount(
  count: number,
  messages: MatchCountMessages = defaultMessages,
): string {
  if (count === 0) {
    return messages.none;
  }

  return count === 1 ? messages.one(count) : messages.other(count);
}
