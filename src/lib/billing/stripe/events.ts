import type { Plan } from "../plans";

/**
 * Pure Stripe-event -> billing-change reducer. Given a parsed event, it returns
 * how to identify the org (by Stripe customer id, or org id from checkout) and
 * what to set — but performs no I/O, so it's exhaustively unit-tested. The
 * caller applies the result to the database.
 */
export interface StripeEvent {
  id?: string;
  type: string;
  data?: { object?: unknown };
}

export interface BillingSet {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: Date | null;
  plan?: string;
  includedMonthlyCredits?: number;
}

export interface BillingUpdate {
  byCustomerId?: string;
  byOrgId?: string;
  set: BillingSet;
  /** Reset the monthly credit counter (a fresh billing cycle was paid). */
  refillCredits?: boolean;
}

export type ReduceResult =
  | { kind: "update"; update: BillingUpdate }
  | { kind: "ignore"; reason: string };

function asObject(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : undefined;
}
function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function asNumber(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function ignore(reason: string): ReduceResult {
  return { kind: "ignore", reason };
}

export function reduceStripeEvent(
  event: StripeEvent,
  resolvePlanByPrice: (priceId: string) => Plan | undefined,
  freeMonthlyCredits: number,
): ReduceResult {
  const object = asObject(asObject(event.data)?.object) ?? {};
  const customer = asString(object.customer);

  switch (event.type) {
    case "checkout.session.completed": {
      if (!customer) return ignore("checkout session had no customer");
      const subscription = asString(object.subscription);
      const orgId = asString(object.client_reference_id) ?? asString(asObject(object.metadata)?.orgId);
      const set: BillingSet = { stripeCustomerId: customer };
      if (subscription) set.stripeSubscriptionId = subscription;
      // Prefer linking by our own org id (from checkout), else by customer.
      return {
        kind: "update",
        update: orgId ? { byOrgId: orgId, set } : { byCustomerId: customer, set },
      };
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      if (!customer) return ignore("subscription had no customer");
      const status = asString(object.status);
      const items = asObject(object.items);
      const itemsData = Array.isArray(items?.data) ? (items!.data as unknown[]) : [];
      const priceId = asString(asObject(asObject(itemsData[0])?.price)?.id);
      const plan = priceId ? resolvePlanByPrice(priceId) : undefined;

      const set: BillingSet = {
        stripeCustomerId: customer,
        subscriptionStatus: status ?? null,
        stripeSubscriptionId: asString(object.id) ?? null,
      };
      const periodEnd = asNumber(object.current_period_end);
      if (periodEnd) set.currentPeriodEnd = new Date(periodEnd * 1000);

      const active = status === "active" || status === "trialing";
      if (plan && active) {
        set.plan = plan.id;
        set.includedMonthlyCredits = plan.monthlyCredits;
      }
      // We stamp our org id into subscription metadata at checkout, so we can
      // link even if this event arrives before checkout.session.completed.
      const orgId = asString(asObject(object.metadata)?.orgId);
      return {
        kind: "update",
        update: orgId ? { byOrgId: orgId, set } : { byCustomerId: customer, set },
      };
    }

    case "customer.subscription.deleted": {
      if (!customer) return ignore("subscription had no customer");
      return {
        kind: "update",
        update: {
          byCustomerId: customer,
          set: {
            plan: "free",
            includedMonthlyCredits: freeMonthlyCredits,
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          },
        },
      };
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      if (!customer) return ignore("invoice had no customer");
      // A new cycle was paid — mark active and refill the monthly credits.
      return {
        kind: "update",
        update: { byCustomerId: customer, set: { subscriptionStatus: "active" }, refillCredits: true },
      };
    }

    case "invoice.payment_failed": {
      if (!customer) return ignore("invoice had no customer");
      return { kind: "update", update: { byCustomerId: customer, set: { subscriptionStatus: "past_due" } } };
    }

    default:
      return ignore(`unhandled event type: ${event.type}`);
  }
}
