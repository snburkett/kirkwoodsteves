import crypto from "node:crypto";

const DEFAULT_ALGO = "sha256";
const HEADER_NAME = "x-run-signature";

function getSecret(): string {
  const secret = process.env.CONTENT_HMAC_KEY;
  if (!secret) {
    throw new Error("CONTENT_HMAC_KEY is not configured");
  }
  return secret;
}

export function signPayload(payload: string, secret = getSecret()): string {
  return crypto.createHmac(DEFAULT_ALGO, secret).update(payload).digest("hex");
}

export function verifyRunSignature(
  signature: string | null,
  payload: string,
  secret = getSecret(),
): boolean {
  if (!signature) {
    return false;
  }
  const expected = signPayload(payload, secret);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export function getSignatureHeaderName(): string {
  return HEADER_NAME;
}
