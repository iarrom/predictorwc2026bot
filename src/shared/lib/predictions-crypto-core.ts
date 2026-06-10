import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { PredictionOutcome } from "@/entities/prediction/model/types";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const OUTCOMES = new Set<PredictionOutcome>(["home", "draw", "away"]);

export interface PredictionCryptoContext {
  userId: string;
  matchId: string;
}

function buildAad({ userId, matchId }: PredictionCryptoContext): Buffer {
  return Buffer.from(`${userId}:${matchId}`, "utf8");
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
    throw new Error("Invalid encrypted prediction payload");
  }

  const iv = Buffer.from(ivPart, "base64url");
  const data = Buffer.from(dataPart, "base64url");

  if (iv.length !== IV_LENGTH || data.length < AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted prediction payload");
  }

  return {
    iv,
    ciphertext: data.subarray(0, data.length - AUTH_TAG_LENGTH),
    authTag: data.subarray(data.length - AUTH_TAG_LENGTH),
  };
}

function assertOutcome(value: string): PredictionOutcome {
  if (!OUTCOMES.has(value as PredictionOutcome)) {
    throw new Error("Decrypted prediction outcome is invalid");
  }
  return value as PredictionOutcome;
}

export function encryptOutcome(
  outcome: PredictionOutcome,
  context: PredictionCryptoContext,
  key: Buffer = getEncryptionKeyFromEnv(),
): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  cipher.setAAD(buildAad(context));

  const ciphertext = Buffer.concat([
    cipher.update(outcome, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return encodePayload(iv, ciphertext, authTag);
}

export function decryptOutcome(
  payload: string,
  context: PredictionCryptoContext,
  key: Buffer = getEncryptionKeyFromEnv(),
): PredictionOutcome {
  const { iv, ciphertext, authTag } = decodePayload(payload);
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAAD(buildAad(context));
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return assertOutcome(plaintext);
}

export interface EncryptedPredictionRow {
  user_id: string;
  match_id: string;
  outcome_encrypted: string;
}

export interface DecryptedPredictionRow {
  user_id: string;
  match_id: string;
  outcome: PredictionOutcome;
}

export function decryptPredictionRows(
  rows: EncryptedPredictionRow[],
  key: Buffer = getEncryptionKeyFromEnv(),
): DecryptedPredictionRow[] {
  return rows.map((row) => ({
    user_id: row.user_id,
    match_id: row.match_id,
    outcome: decryptOutcome(
      row.outcome_encrypted,
      {
        userId: row.user_id,
        matchId: row.match_id,
      },
      key,
    ),
  }));
}
