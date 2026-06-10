import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptTiebreakerGoals,
  decryptTiebreakerRows,
  encryptTiebreakerGoals,
} from "@/shared/lib/tiebreaker-crypto-core";

const TEST_KEY = randomBytes(32).toString("base64");

const userA = "11111111-1111-1111-1111-111111111111";
const userB = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  process.env.PREDICTIONS_ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  delete process.env.PREDICTIONS_ENCRYPTION_KEY;
});

describe("tiebreaker-crypto", () => {
  it("roundtrips encrypted goals", () => {
    const encrypted = encryptTiebreakerGoals(42, {
      userId: userA,
      roundKey: "group_1",
    });

    expect(
      decryptTiebreakerGoals(encrypted, {
        userId: userA,
        roundKey: "group_1",
      }),
    ).toBe(42);
  });

  it("rejects decryption with mismatched AAD", () => {
    const encrypted = encryptTiebreakerGoals(10, {
      userId: userA,
      roundKey: "playoff",
    });

    expect(() =>
      decryptTiebreakerGoals(encrypted, {
        userId: userB,
        roundKey: "playoff",
      }),
    ).toThrow();
    expect(() =>
      decryptTiebreakerGoals(encrypted, {
        userId: userA,
        roundKey: "group_2",
      }),
    ).toThrow();
  });

  it("decrypts tiebreaker rows in batch for future scoring", () => {
    const rows = [
      {
        user_id: userA,
        round_key: "group_1" as const,
        goals_encrypted: encryptTiebreakerGoals(120, {
          userId: userA,
          roundKey: "group_1",
        }),
      },
      {
        user_id: userB,
        round_key: "playoff" as const,
        goals_encrypted: encryptTiebreakerGoals(3, {
          userId: userB,
          roundKey: "playoff",
        }),
      },
    ];

    expect(decryptTiebreakerRows(rows)).toEqual([
      { user_id: userA, round_key: "group_1", goals: 120 },
      { user_id: userB, round_key: "playoff", goals: 3 },
    ]);
  });
});
