/**
 * Billing & spend guardrails.
 *
 * Two independent gates protect every generation:
 *   1. Per-tenant CREDITS  — a SaaS quota (free monthly + purchased).
 *   2. Global SPEND cap    — a hard USD ceiling on real (paid) generations,
 *                            so the app itself refuses to spend beyond the
 *                            configured limit (default $10), independent of
 *                            any billing cap set on Google's side.
 *
 * All functions are pure: the current usage numbers are passed in (the DB
 * layer supplies them), which keeps this fully unit-testable.
 */

/** Default per-image cost estimate for Gemini 2.5 Flash Image. */
export const DEFAULT_COST_PER_IMAGE_USD = 0.039;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---- Global spend cap ------------------------------------------------------

export interface SpendState {
  /** Total estimated USD already spent on paid generations. */
  totalSpentUsd: number;
  /** Hard ceiling in USD. */
  limitUsd: number;
}

export interface SpendDecision {
  allowed: boolean;
  reason?: string;
  remainingUsd: number;
}

export function authorizeSpend(state: SpendState, costUsd: number): SpendDecision {
  const remaining = round2(state.limitUsd - state.totalSpentUsd);
  // Free generations (mock engine) never touch the spend cap.
  if (costUsd <= 0) {
    return { allowed: true, remainingUsd: Math.max(0, remaining) };
  }
  // Use a tiny epsilon so floating-point sums don't spuriously exceed.
  if (state.totalSpentUsd + costUsd > state.limitUsd + 1e-9) {
    return {
      allowed: false,
      reason: `Spend limit of $${state.limitUsd.toFixed(2)} reached. Raise SPEND_LIMIT_USD to continue with paid generations.`,
      remainingUsd: Math.max(0, remaining),
    };
  }
  return { allowed: true, remainingUsd: round2(remaining - costUsd) };
}

// ---- Per-tenant credits ----------------------------------------------------

export interface CreditState {
  /** Free credits included this billing month. */
  includedThisMonth: number;
  /** Free credits already used this month. */
  usedThisMonth: number;
  /** Additional purchased credits still available (optional). */
  purchasedRemaining?: number;
}

export interface CreditDecision {
  allowed: boolean;
  reason?: string;
  remainingCredits: number;
}

export function authorizeCredit(state: CreditState): CreditDecision {
  const purchased = Math.max(0, state.purchasedRemaining ?? 0);
  const freeRemaining = Math.max(0, state.includedThisMonth - state.usedThisMonth);
  const remaining = freeRemaining + purchased;
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: "You've used all your credits for this month.",
      remainingCredits: 0,
    };
  }
  return { allowed: true, remainingCredits: remaining };
}

// ---- Combined authorization ------------------------------------------------

export interface GenerationAuthzInput {
  costUsd: number;
  spend: SpendState;
  credit: CreditState;
}

export interface GenerationAuthzResult {
  allowed: boolean;
  reason?: string;
  remainingUsd: number;
  remainingCredits: number;
}

/** Gate a generation on BOTH credits and the global spend cap. */
export function authorizeGeneration(input: GenerationAuthzInput): GenerationAuthzResult {
  const credit = authorizeCredit(input.credit);
  const remainingUsd = Math.max(0, round2(input.spend.limitUsd - input.spend.totalSpentUsd));
  if (!credit.allowed) {
    return { allowed: false, reason: credit.reason, remainingUsd, remainingCredits: 0 };
  }
  const spend = authorizeSpend(input.spend, input.costUsd);
  if (!spend.allowed) {
    return {
      allowed: false,
      reason: spend.reason,
      remainingUsd: spend.remainingUsd,
      remainingCredits: credit.remainingCredits,
    };
  }
  return {
    allowed: true,
    remainingUsd: spend.remainingUsd,
    remainingCredits: credit.remainingCredits,
  };
}
