/**
 * Subscription plans. Each paid plan maps to a Stripe Price (its id comes from
 * env at runtime) and to a monthly credit allowance. Credits are the unit the
 * generation pipeline already meters against, so a plan change is just a new
 * `includedMonthlyCredits` on the org.
 */
export type PlanId = "free" | "starter" | "pro" | "studio";

export interface Plan {
  id: PlanId;
  name: string;
  blurb: string;
  monthlyCredits: number;
  paid: boolean;
  /** Env var holding this plan's Stripe Price id (paid plans only). */
  priceEnvKey?: string;
}

export const PLANS: readonly Plan[] = [
  { id: "free", name: "Free", blurb: "Try it out", monthlyCredits: 30, paid: false },
  {
    id: "starter",
    name: "Starter",
    blurb: "For a single busy studio",
    monthlyCredits: 150,
    paid: true,
    priceEnvKey: "STRIPE_PRICE_STARTER",
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For a growing shop",
    monthlyCredits: 600,
    paid: true,
    priceEnvKey: "STRIPE_PRICE_PRO",
  },
  {
    id: "studio",
    name: "Studio",
    blurb: "High volume / multi-branch",
    monthlyCredits: 2500,
    paid: true,
    priceEnvKey: "STRIPE_PRICE_STUDIO",
  },
];

export const DEFAULT_PLAN_ID: PlanId = "free";

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function freeCredits(): number {
  return getPlan("free")?.monthlyCredits ?? 30;
}

/**
 * Build a Stripe-priceId -> Plan map from the given env lookup. Only paid plans
 * whose price env is set are included, so unconfigured plans are simply absent.
 */
export function buildPriceToPlan(getEnv: (key: string) => string | undefined): Map<string, Plan> {
  const map = new Map<string, Plan>();
  for (const plan of PLANS) {
    if (!plan.priceEnvKey) continue;
    const priceId = getEnv(plan.priceEnvKey);
    if (priceId) map.set(priceId, plan);
  }
  return map;
}
