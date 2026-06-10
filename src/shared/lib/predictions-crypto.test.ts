import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptOutcome,
  decryptPredictionRows,
  encryptOutcome,
} from "@/shared/lib/predictions-crypto-core";

const TEST_KEY = randomBytes(32).toString("base64");

const userA = "11111111-1111-1111-1111-111111111111";
const userB = "22222222-2222-2222-2222-222222222222";
const matchA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const matchB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

beforeEach(() => {
  process.env.PREDICTIONS_ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  delete process.env.PREDICTIONS_ENCRYPTION_KEY;
});

describe("predictions-crypto", () => {
  it("roundtrips encrypted outcomes", () => {
    const encrypted = encryptOutcome("home", {
      userId: userA,
      matchId: matchA,
    });

    expect(decryptOutcome(encrypted, { userId: userA, matchId: matchA })).toBe(
      "home",
    );
  });

  it("produces different ciphertext for the same outcome", () => {
    const first = encryptOutcome("draw", { userId: userA, matchId: matchA });
    const second = encryptOutcome("draw", { userId: userA, matchId: matchA });

    expect(first).not.toBe(second);
    expect(decryptOutcome(first, { userId: userA, matchId: matchA })).toBe(
      "draw",
    );
    expect(decryptOutcome(second, { userId: userA, matchId: matchA })).toBe(
      "draw",
    );
  });

  it("rejects decryption with mismatched AAD", () => {
    const encrypted = encryptOutcome("away", {
      userId: userA,
      matchId: matchA,
    });

    expect(() =>
      decryptOutcome(encrypted, { userId: userB, matchId: matchA }),
    ).toThrow();
    expect(() =>
      decryptOutcome(encrypted, { userId: userA, matchId: matchB }),
    ).toThrow();
  });

  it("rejects tampered payloads", () => {
    const encrypted = encryptOutcome("home", {
      userId: userA,
      matchId: matchA,
    });
    const tampered = `${encrypted}x`;

    expect(() =>
      decryptOutcome(tampered, { userId: userA, matchId: matchA }),
    ).toThrow();
  });

  it("decrypts prediction rows in batch for future scoring", () => {
    const rows = [
      {
        user_id: userA,
        match_id: matchA,
        outcome_encrypted: encryptOutcome("home", {
          userId: userA,
          matchId: matchA,
        }),
      },
      {
        user_id: userB,
        match_id: matchA,
        outcome_encrypted: encryptOutcome("draw", {
          userId: userB,
          matchId: matchA,
        }),
      },
    ];

    expect(decryptPredictionRows(rows)).toEqual([
      { user_id: userA, match_id: matchA, outcome: "home" },
      { user_id: userB, match_id: matchA, outcome: "draw" },
    ]);
  });
});
