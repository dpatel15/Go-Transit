import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a Stripe webhook signature without the SDK, so it's fully unit-tested.
 *
 * Stripe sends `Stripe-Signature: t=<unix>,v1=<hex>[,v1=<hex>]`. The signed
 * payload is `"<t>.<rawBody>"`, HMAC-SHA256 with the endpoint's signing secret
 * (whsec_...). We also reject timestamps outside a tolerance to blunt replay.
 */
export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

export function verifyStripeSignature(
  payload: string,
  header: string | null | undefined,
  secret: string,
  opts: { toleranceSec?: number; nowMs?: number } = {},
): VerifyResult {
  if (!secret) return { ok: false, reason: "missing signing secret" };
  if (!header) return { ok: false, reason: "missing signature header" };

  const toleranceSec = opts.toleranceSec ?? 300;
  const nowSec = (opts.nowMs ?? Date.now()) / 1000;

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) {
    return { ok: false, reason: "malformed signature header" };
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "invalid timestamp" };
  if (Math.abs(nowSec - ts) > toleranceSec) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  const matched = signatures.some((sig) => {
    let sigBuf: Buffer;
    try {
      sigBuf = Buffer.from(sig, "hex");
    } catch {
      return false;
    }
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });

  return matched ? { ok: true } : { ok: false, reason: "no matching signature" };
}
