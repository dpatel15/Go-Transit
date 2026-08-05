import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with scrypt (a memory-hard KDF built into Node — no native
 * add-ons, no download). Hashes are self-describing: "scrypt$N$r$p$salt$hash".
 *
 * If you'd rather offload auth entirely, this module is small and isolated —
 * swapping in Clerk / Auth.js later touches only the auth service, not the app.
 */

const N = 16384; // CPU/memory cost (2^14)
const R = 8;
const P = 1;
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, nStr, rStr, pStr, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !nStr || !rStr || !pStr || !saltB64 || !hashB64) {
    return false;
  }
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = scryptSync(password, salt, expected.length, { N: n, r, p });
  } catch {
    return false;
  }
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export interface PasswordCheck {
  ok: boolean;
  reason?: string;
}

/** Basic strength policy. Deliberately simple and predictable. */
export function validatePasswordStrength(password: string): PasswordCheck {
  if (password.length < 10) {
    return { ok: false, reason: "Password must be at least 10 characters." };
  }
  if (password.length > 200) {
    return { ok: false, reason: "Password must be at most 200 characters." };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, reason: "Include at least one letter and one number." };
  }
  return { ok: true };
}
