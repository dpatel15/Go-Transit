import { describe, it, expect } from "vitest";
import { reduceStripeEvent } from "./events";
import { getPlan } from "../plans";

const resolve = (priceId: string) =>
  priceId === "price_pro" ? getPlan("pro") : priceId === "price_starter" ? getPlan("starter") : undefined;
const FREE = 30;

describe("reduceStripeEvent", () => {
  it("links customer + subscription on checkout.session.completed", () => {
    const r = reduceStripeEvent(
      {
        type: "checkout.session.completed",
        data: { object: { customer: "cus_1", subscription: "sub_1", client_reference_id: "org_1" } },
      },
      resolve,
      FREE,
    );
    expect(r).toEqual({
      kind: "update",
      update: { byOrgId: "org_1", set: { stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" } },
    });
  });

  it("sets plan + credits on an active subscription.updated", () => {
    const r = reduceStripeEvent(
      {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_1",
            customer: "cus_1",
            status: "active",
            current_period_end: 1_700_000_000,
            items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      },
      resolve,
      FREE,
    );
    expect(r.kind).toBe("update");
    if (r.kind === "update") {
      expect(r.update.byCustomerId).toBe("cus_1");
      expect(r.update.set.plan).toBe("pro");
      expect(r.update.set.includedMonthlyCredits).toBe(getPlan("pro")!.monthlyCredits);
      expect(r.update.set.subscriptionStatus).toBe("active");
      expect(r.update.set.currentPeriodEnd).toEqual(new Date(1_700_000_000 * 1000));
    }
  });

  it("does not change plan/credits when the subscription is not active", () => {
    const r = reduceStripeEvent(
      {
        type: "customer.subscription.updated",
        data: { object: { id: "sub_1", customer: "cus_1", status: "incomplete", items: { data: [{ price: { id: "price_pro" } }] } } },
      },
      resolve,
      FREE,
    );
    if (r.kind === "update") {
      expect(r.update.set.plan).toBeUndefined();
      expect(r.update.set.includedMonthlyCredits).toBeUndefined();
      expect(r.update.set.subscriptionStatus).toBe("incomplete");
    }
  });

  it("downgrades to free on subscription.deleted", () => {
    const r = reduceStripeEvent(
      { type: "customer.subscription.deleted", data: { object: { customer: "cus_1" } } },
      resolve,
      FREE,
    );
    if (r.kind === "update") {
      expect(r.update.set.plan).toBe("free");
      expect(r.update.set.includedMonthlyCredits).toBe(FREE);
      expect(r.update.set.subscriptionStatus).toBe("canceled");
      expect(r.update.set.stripeSubscriptionId).toBeNull();
    }
  });

  it("refills credits on invoice.paid and marks past_due on failure", () => {
    const paid = reduceStripeEvent({ type: "invoice.paid", data: { object: { customer: "cus_1" } } }, resolve, FREE);
    if (paid.kind === "update") {
      expect(paid.update.refillCredits).toBe(true);
      expect(paid.update.set.subscriptionStatus).toBe("active");
    }
    const failed = reduceStripeEvent(
      { type: "invoice.payment_failed", data: { object: { customer: "cus_1" } } },
      resolve,
      FREE,
    );
    if (failed.kind === "update") expect(failed.update.set.subscriptionStatus).toBe("past_due");
  });

  it("ignores unknown events and events without a customer", () => {
    expect(reduceStripeEvent({ type: "customer.created", data: { object: {} } }, resolve, FREE).kind).toBe("ignore");
    expect(reduceStripeEvent({ type: "invoice.paid", data: { object: {} } }, resolve, FREE).kind).toBe("ignore");
  });
});
