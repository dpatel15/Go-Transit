import { describe, it, expect } from "vitest";
import { LiveStripeGateway, createStripeGateway } from "./gateway";

interface Captured {
  url?: string;
  init?: RequestInit;
}
function fakeFetch(captured: Captured, response: { ok?: boolean; status?: number; body: unknown }): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    captured.url = url;
    captured.init = init;
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.body,
    };
  }) as unknown as typeof fetch;
}

describe("LiveStripeGateway", () => {
  it("builds a subscription checkout session request", async () => {
    const captured: Captured = {};
    const gw = new LiveStripeGateway({
      secretKey: "sk_test",
      fetchImpl: fakeFetch(captured, { body: { url: "https://checkout.stripe.com/x" } }),
    });
    const out = await gw.createCheckoutSession({
      priceId: "price_pro",
      orgId: "org_1",
      successUrl: "https://a/s",
      cancelUrl: "https://a/c",
      customerEmail: "u@x.com",
    });
    expect(out.url).toBe("https://checkout.stripe.com/x");
    expect(captured.url).toContain("/v1/checkout/sessions");

    const body = new URLSearchParams(captured.init!.body as string);
    expect(body.get("mode")).toBe("subscription");
    expect(body.get("line_items[0][price]")).toBe("price_pro");
    expect(body.get("client_reference_id")).toBe("org_1");
    expect(body.get("subscription_data[metadata][orgId]")).toBe("org_1");
    expect(body.get("customer_email")).toBe("u@x.com");
    const headers = captured.init!.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sk_test");
  });

  it("uses an existing customer id when provided", async () => {
    const captured: Captured = {};
    const gw = new LiveStripeGateway({ secretKey: "sk", fetchImpl: fakeFetch(captured, { body: { url: "u" } }) });
    await gw.createCheckoutSession({ priceId: "p", orgId: "o", successUrl: "s", cancelUrl: "c", customerId: "cus_9" });
    const body = new URLSearchParams(captured.init!.body as string);
    expect(body.get("customer")).toBe("cus_9");
    expect(body.get("customer_email")).toBeNull();
  });

  it("creates a billing portal session", async () => {
    const captured: Captured = {};
    const gw = new LiveStripeGateway({ secretKey: "sk", fetchImpl: fakeFetch(captured, { body: { url: "https://portal" } }) });
    const out = await gw.createPortalSession({ customerId: "cus_1", returnUrl: "https://back" });
    expect(out.url).toBe("https://portal");
    expect(captured.url).toContain("/v1/billing_portal/sessions");
  });

  it("throws on an API error without leaking the key", async () => {
    const captured: Captured = {};
    const gw = new LiveStripeGateway({
      secretKey: "sk_secret",
      fetchImpl: fakeFetch(captured, { ok: false, status: 400, body: { error: { message: "No such price" } } }),
    });
    await expect(
      gw.createCheckoutSession({ priceId: "bad", orgId: "o", successUrl: "s", cancelUrl: "c" }),
    ).rejects.toThrow(/400/);
    try {
      await gw.createCheckoutSession({ priceId: "bad", orgId: "o", successUrl: "s", cancelUrl: "c" });
    } catch (e) {
      expect((e as Error).message).not.toContain("sk_secret");
    }
  });

  it("createStripeGateway returns a disabled gateway without a key", async () => {
    const gw = createStripeGateway({});
    expect(gw.enabled).toBe(false);
    await expect(
      gw.createCheckoutSession({ priceId: "p", orgId: "o", successUrl: "s", cancelUrl: "c" }),
    ).rejects.toThrow(/not configured/i);
  });
});
