import type { PredictionOutcome } from "./scoring.ts";

const VERSION = "v1";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const OUTCOMES = new Set<PredictionOutcome>(["home", "draw", "away"]);

export interface PredictionCryptoContext {
  userId: string;
  matchId: string;
}

function buildAad({ userId, matchId }: PredictionCryptoContext): Uint8Array {
  return new TextEncoder().encode(`${userId}:${matchId}`);
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function getEncryptionKeyFromEnv(): Uint8Array {
  const raw = Deno.env.get("PREDICTIONS_ENCRYPTION_KEY");
  if (!raw) {
    throw new Error("PREDICTIONS_ENCRYPTION_KEY is not configured");
  }

  const key = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  if (key.length !== 32) {
    throw new Error(
      "PREDICTIONS_ENCRYPTION_KEY must be 32 bytes encoded as base64",
    );
  }

  return key;
}

function decodePayload(payload: string): {
  iv: Uint8Array;
  ciphertext: Uint8Array;
  authTag: Uint8Array;
} {
  const [version, ivPart, dataPart] = payload.split(".");
  if (version !== VERSION || !ivPart || !dataPart) {
    throw new Error("Invalid encrypted prediction payload");
  }

  const iv = decodeBase64Url(ivPart);
  const data = decodeBase64Url(dataPart);

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

export async function decryptOutcome(
  payload: string,
  context: PredictionCryptoContext,
  key: Uint8Array,
): Promise<PredictionOutcome> {
  const { iv, ciphertext, authTag } = decodePayload(payload);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const encrypted = new Uint8Array(ciphertext.length + authTag.length);
  encrypted.set(ciphertext);
  encrypted.set(authTag, ciphertext.length);

  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: buildAad(context),
      tagLength: AUTH_TAG_LENGTH * 8,
    },
    cryptoKey,
    encrypted,
  );

  return assertOutcome(new TextDecoder().decode(plaintext));
}
