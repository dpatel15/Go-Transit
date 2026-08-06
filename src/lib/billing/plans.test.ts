import { describe, it, expect } from "vitest";
import { PLANS, getPlan, buildPriceToPlan, freeCredits } from "./plans";

describe("plans", () => {
  it("has a free plan and unique ids", () => {
    expect(getPlan("free")?.paid).toBe(false);
    expect(new Set(PLANS.map((p) => p.id)).size).toBe(PLANS.length);
  });

  it("exposes a positive free credit allowance", () => {
    expect(freeCredits()).toBeGreaterThan(0);
  });

  it("maps only configured Stripe prices to plans", () => {
    const env: Record<string, string> = { STRIPE_PRICE_PRO: "price_pro" };
    const map = buildPriceToPlan((k) => env[k]);
    expect(map.get("price_pro")?.id).toBe("pro");
    expect(map.has("price_starter")).toBe(false);
    expect(map.size).toBe(1);
  });
});
