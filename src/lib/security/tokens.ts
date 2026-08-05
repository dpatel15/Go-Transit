import { createHash, randomBytes, randomUUID } from "node:crypto";

/**
 * Opaque session tokens. The raw token lives only in the user's httpOnly
 * cookie; we store just its SHA-256 hash, so a database leak never yields a
 * usable session token.
 */

/** 256 bits of entropy, URL-safe. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Hash a token for at-rest storage / lookup. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Collision-resistant identifier for rows (Prisma also has cuid, this is fine). */
export function newId(): string {
  return randomUUID();
}

/** A random per-form CSRF token (double-submit cookie pattern). */
export function generateCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}
