import { describe, it, expect } from "vitest";
import {
  authorizeSpend,
  authorizeCredit,
  authorizeGeneration,
  DEFAULT_COST_PER_IMAGE_USD,
} from "./spend-guard";

describe("authorizeSpend", () => {
  it("allows a paid generation under the cap", () => {
    const d = authorizeSpend({ totalSpentUsd: 5, limitUsd: 10 }, DEFAULT_COST_PER_IMAGE_USD);
    expect(d.allowed).toBe(true);
    expect(d.remainingUsd).toBeCloseTo(10 - 5 - DEFAULT_COST_PER_IMAGE_USD, 2);
  });

  it("blocks when the next generation would exceed the cap", () => {
    const d = authorizeSpend({ totalSpentUsd: 9.99, limitUsd: 10 }, 0.05);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/limit/i);
  });

  it("allows exactly hitting the cap", () => {
    const d = authorizeSpend({ totalSpentUsd: 9.96, limitUsd: 10 }, 0.04);
    expect(d.allowed).toBe(true);
  });

  it("never charges the cap for free (mock) generations", () => {
    const d = authorizeSpend({ totalSpentUsd: 10, limitUsd: 10 }, 0);
    expect(d.allowed).toBe(true);
  });
});

describe("authorizeCredit", () => {
  it("allows when free credits remain", () => {
    expect(authorizeCredit({ includedThisMonth: 30, usedThisMonth: 10 })).toMatchObject({
      allowed: true,
      remainingCredits: 20,
    });
  });

  it("blocks when monthly credits are exhausted", () => {
    const d = authorizeCredit({ includedThisMonth: 30, usedThisMonth: 30 });
    expect(d.allowed).toBe(false);
    expect(d.remainingCredits).toBe(0);
  });

  it("counts purchased credits on top of free ones", () => {
    const d = authorizeCredit({ includedThisMonth: 5, usedThisMonth: 5, purchasedRemaining: 3 });
    expect(d.allowed).toBe(true);
    expect(d.remainingCredits).toBe(3);
  });
});

describe("authorizeGeneration", () => {
  it("requires both credits and spend headroom", () => {
    const ok = authorizeGeneration({
      costUsd: 0.039,
      spend: { totalSpentUsd: 0, limitUsd: 10 },
      credit: { includedThisMonth: 30, usedThisMonth: 0 },
    });
    expect(ok.allowed).toBe(true);
  });

  it("blocks on no credits even if spend is fine", () => {
    const d = authorizeGeneration({
      costUsd: 0.039,
      spend: { totalSpentUsd: 0, limitUsd: 10 },
      credit: { includedThisMonth: 30, usedThisMonth: 30 },
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/credit/i);
  });

  it("blocks on spend cap even if credits remain", () => {
    const d = authorizeGeneration({
      costUsd: 0.05,
      spend: { totalSpentUsd: 10, limitUsd: 10 },
      credit: { includedThisMonth: 30, usedThisMonth: 0 },
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/limit/i);
  });

  it("allows a free (mock) generation at the spend cap as long as credits remain", () => {
    const d = authorizeGeneration({
      costUsd: 0,
      spend: { totalSpentUsd: 10, limitUsd: 10 },
      credit: { includedThisMonth: 30, usedThisMonth: 0 },
    });
    expect(d.allowed).toBe(true);
  });
});
