/**
 * Thin Stripe gateway over the REST API (form-encoded), with an injectable
 * fetch so the request shapes are unit-testable, and a "disabled" implementation
 * used when no secret key is configured — so the app runs perfectly on the free
 * plan until billing is switched on.
 */

export interface CheckoutParams {
  priceId: string;
  orgId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
}

export interface StripeGateway {
  readonly enabled: boolean;
  createCheckoutSession(params: CheckoutParams): Promise<{ url: string }>;
  createPortalSession(params: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
}

export interface LiveStripeGatewayOptions {
  secretKey: string;
  baseUrl?: string;
  apiVersion?: string;
  fetchImpl?: typeof fetch;
}

export class LiveStripeGateway implements StripeGateway {
  readonly enabled = true;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: LiveStripeGatewayOptions) {
    if (!opts.secretKey) throw new Error("LiveStripeGateway requires a secret key");
    this.secretKey = opts.secretKey;
    this.baseUrl = opts.baseUrl ?? "https://api.stripe.com";
    this.apiVersion = opts.apiVersion ?? "2024-06-20";
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async post(path: string, form: URLSearchParams): Promise<Record<string, unknown>> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
        "stripe-version": this.apiVersion,
      },
      body: form.toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = json.error as { message?: string } | undefined;
      throw new Error(`Stripe API error ${res.status}: ${err?.message ?? "request failed"}`);
    }
    return json;
  }

  async createCheckoutSession(p: CheckoutParams): Promise<{ url: string }> {
    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("line_items[0][price]", p.priceId);
    form.set("line_items[0][quantity]", "1");
    form.set("success_url", p.successUrl);
    form.set("cancel_url", p.cancelUrl);
    form.set("client_reference_id", p.orgId);
    form.set("metadata[orgId]", p.orgId);
    form.set("subscription_data[metadata][orgId]", p.orgId);
    form.set("allow_promotion_codes", "true");
    if (p.customerId) form.set("customer", p.customerId);
    else if (p.customerEmail) form.set("customer_email", p.customerEmail);

    const json = await this.post("/v1/checkout/sessions", form);
    const url = typeof json.url === "string" ? json.url : null;
    if (!url) throw new Error("Stripe did not return a checkout URL");
    return { url };
  }

  async createPortalSession(p: { customerId: string; returnUrl: string }): Promise<{ url: string }> {
    const form = new URLSearchParams();
    form.set("customer", p.customerId);
    form.set("return_url", p.returnUrl);
    const json = await this.post("/v1/billing_portal/sessions", form);
    const url = typeof json.url === "string" ? json.url : null;
    if (!url) throw new Error("Stripe did not return a portal URL");
    return { url };
  }
}

export class DisabledStripeGateway implements StripeGateway {
  readonly enabled = false;
  async createCheckoutSession(): Promise<{ url: string }> {
    throw new Error("Billing is not configured on this deployment.");
  }
  async createPortalSession(): Promise<{ url: string }> {
    throw new Error("Billing is not configured on this deployment.");
  }
}

export function createStripeGateway(opts: { secretKey?: string; fetchImpl?: typeof fetch }): StripeGateway {
  if (!opts.secretKey) return new DisabledStripeGateway();
  return new LiveStripeGateway({ secretKey: opts.secretKey, fetchImpl: opts.fetchImpl });
}
