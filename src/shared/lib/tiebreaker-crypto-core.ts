import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { TiebreakerRoundKey } from "@/entities/tiebreaker/model/types";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const MAX_GOALS = 300;

export interface TiebreakerCryptoContext {
  userId: string;
  roundKey: TiebreakerRoundKey;
}

function buildAad({ userId, roundKey }: TiebreakerCryptoContext): Buffer {
  return Buffer.from(`${userId}:tiebreaker:${roundKey}`, "utf8");
}

export function getEncryptionKeyFromEnv(): Buffer {
  const raw = process.env.PREDICTIONS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("PREDICTIONS_ENCRYPTION_KEY is not configured");
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "PREDICTIONS_ENCRYPTION_KEY must be 32 bytes encoded as base64",
    );
  }

  return key;
}

function encodePayload(iv: Buffer, ciphertext: Buffer, authTag: Buffer): string {
  return `${VERSION}.${iv.toString("base64url")}.${Buffer.concat([ciphertext, authTag]).toString("base64url")}`;
}

function decodePayload(payload: string): {
  iv: Buffer;
  ciphertext: Buffer;
  authTag: Buffer;
} {
  const [version, ivPart, dataPart] = payload.split(".");
  if (version !== VERSION || !ivPart || !dataPart) {
    throw new Error("Invalid encrypted tiebreaker payload");
  }

  const iv = Buffer.from(ivPart, "base64url");
  const data = Buffer.from(dataPart, "base64url");

  if (iv.length !== IV_LENGTH || data.length < AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted tiebreaker payload");
  }

  return {
    iv,
    ciphertext: data.subarray(0, data.length - AUTH_TAG_LENGTH),
    authTag: data.subarray(data.length - AUTH_TAG_LENGTH),
  };
}

function assertGoals(value: string): number {
  const goals = Number.parseInt(value, 10);
  if (
    !Number.isInteger(goals) ||
    goals < 0 ||
    goals > MAX_GOALS
  ) {
    throw new Error("Decrypted tiebreaker goals value is invalid");
  }

  return goals;
}

export function encryptTiebreakerGoals(
  goals: number,
  context: TiebreakerCryptoContext,
  key: Buffer = getEncryptionKeyFromEnv(),
): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  cipher.setAAD(buildAad(context));

  const plaintext = String(goals);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return encodePayload(iv, ciphertext, authTag);
}

export function decryptTiebreakerGoals(
  payload: string,
  context: TiebreakerCryptoContext,
  key: Buffer = getEncryptionKeyFromEnv(),
): number {
  const { iv, ciphertext, authTag } = decodePayload(payload);
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAAD(buildAad(context));
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return assertGoals(plaintext);
}

export interface EncryptedTiebreakerRow {
  user_id: string;
  round_key: TiebreakerRoundKey;
  goals_encrypted: string;
}

export interface DecryptedTiebreakerRow {
  user_id: string;
  round_key: TiebreakerRoundKey;
  goals: number;
}

export function decryptTiebreakerRows(
  rows: EncryptedTiebreakerRow[],
  key: Buffer = getEncryptionKeyFromEnv(),
): DecryptedTiebreakerRow[] {
  return rows.map((row) => ({
    user_id: row.user_id,
    round_key: row.round_key,
    goals: decryptTiebreakerGoals(
      row.goals_encrypted,
      {
        userId: row.user_id,
        roundKey: row.round_key,
      },
      key,
    ),
  }));
}
