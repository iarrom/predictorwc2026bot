export const TIEBREAKER_ROUND_KEYS = [
  "group_1",
  "group_2",
  "group_3",
  "playoff",
] as const;

export type TiebreakerRoundKey = (typeof TIEBREAKER_ROUND_KEYS)[number];

export interface TiebreakerRoundDefinition {
  key: TiebreakerRoundKey;
  label: string;
  maxGoals: number;
}

export const TIEBREAKER_ROUNDS: TiebreakerRoundDefinition[] = [
  { key: "group_1", label: "Matchday 1", maxGoals: 300 },
  { key: "group_2", label: "Matchday 2", maxGoals: 300 },
  { key: "group_3", label: "Matchday 3", maxGoals: 300 },
  { key: "playoff", label: "Playoffs", maxGoals: 300 },
];

export interface TiebreakerRoundState {
  roundKey: TiebreakerRoundKey;
  label: string;
  maxGoals: number;
  matchCount: number;
  goals: number | null;
  locked: boolean;
  deadlineAt: string | null;
}
