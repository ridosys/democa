import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived signed tokens for the Thermer (Bluetooth Print) response URL.
 *
 * The Android app fetches the receipt JSON itself, without the browser's
 * session cookie, so the URL carries its own proof of access:
 * `<expiresAt>.<hmac>`, where the HMAC covers the purpose, the document
 * (printDocSubject: kind, id and, for a waiter report, the day) and the
 * expiry. A token only unlocks the one document it was issued for, and
 * only until it expires. The key is derived from AUTH_SECRET (never sent
 * anywhere) so it can't be confused with any other signature in the app.
 */
export const PRINT_TOKEN_TTL_SECONDS = 5 * 60;

const PURPOSE = "bluetooth-print:document:v2";

function signingKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(PURPOSE).digest();
}

function signature(subject: string, expiresAt: number): Buffer {
  return createHmac("sha256", signingKey())
    .update(`${PURPOSE}\n${subject}\n${expiresAt}`)
    .digest();
}

/** `subject` is printDocSubject(ref). */
export function createPrintToken(subject: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + PRINT_TOKEN_TTL_SECONDS;
  return `${expiresAt}.${signature(subject, expiresAt).toString("base64url")}`;
}

export function verifyPrintToken(
  subject: string,
  token: string | null,
  now = Date.now(),
): "ok" | "invalid" | "expired" {
  const match = token?.match(/^(\d{1,12})\.([A-Za-z0-9_-]{43})$/);
  if (!match) return "invalid";

  const expiresAt = Number(match[1]);
  const given = Buffer.from(match[2], "base64url");
  const expected = signature(subject, expiresAt);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return "invalid";
  }
  return expiresAt < Math.floor(now / 1000) ? "expired" : "ok";
}
