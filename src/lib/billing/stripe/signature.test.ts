import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "./signature";

const secret = "whsec_test_123";
const payload = JSON.stringify({ id: "evt_1", type: "invoice.paid" });
const nowMs = 1_700_000_000_000;
const t = Math.floor(nowMs / 1000);

function header(p: string, s: string, ts: number): string {
  const sig = createHmac("sha256", s).update(`${ts}.${p}`, "utf8").digest("hex");
  return `t=${ts},v1=${sig}`;
}

describe("verifyStripeSignature", () => {
  it("accepts a valid signature", () => {
    expect(verifyStripeSignature(payload, header(payload, secret, t), secret, { nowMs }).ok).toBe(true);
  });

  it("rejects a tampered payload", () => {
    expect(verifyStripeSignature(payload + "x", header(payload, secret, t), secret, { nowMs }).ok).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(verifyStripeSignature(payload, header(payload, secret, t), "whsec_wrong", { nowMs }).ok).toBe(false);
  });

  it("rejects an old timestamp (replay protection)", () => {
    const r = verifyStripeSignature(payload, header(payload, secret, t - 10_000), secret, { nowMs });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/tolerance/);
  });

  it("rejects missing and malformed headers, and a missing secret", () => {
    expect(verifyStripeSignature(payload, null, secret, { nowMs }).ok).toBe(false);
    expect(verifyStripeSignature(payload, "garbage", secret, { nowMs }).ok).toBe(false);
    expect(verifyStripeSignature(payload, header(payload, secret, t), "", { nowMs }).ok).toBe(false);
  });

  it("accepts when one of several v1 signatures matches", () => {
    const good = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
    expect(verifyStripeSignature(payload, `t=${t},v1=deadbeef,v1=${good}`, secret, { nowMs }).ok).toBe(true);
  });
});
