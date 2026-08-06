import { NextResponse } from "next/server";
import { env, billingEnabled } from "@/lib/env";
import { billingService, priceToPlanMap } from "@/lib/server/services";
import { verifyStripeSignature } from "@/lib/billing/stripe/signature";
import { reduceStripeEvent, type StripeEvent } from "@/lib/billing/stripe/events";
import { freeCredits } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * Stripe webhook. Authenticated by signature (not a session), so it is exempt
 * from the origin/CSRF checks. The raw body must be read verbatim for the
 * signature to verify.
 */
export async function POST(req: Request) {
  if (!billingEnabled || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing not configured." }, { status: 503 });
  }

  const payload = await req.text();
  const verify = verifyStripeSignature(payload, req.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!verify.ok) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Idempotency — Stripe can deliver the same event more than once.
  if (event.id && (await billingService.alreadyProcessed(event.id))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const priceMap = priceToPlanMap();
  const result = reduceStripeEvent(event, (priceId) => priceMap.get(priceId), freeCredits());
  if (result.kind === "update") {
    const applied = await billingService.applyUpdate(result.update);
    if (!applied) {
      console.warn("stripe webhook: no organization matched", event.type, event.id);
    }
  }

  if (event.id) await billingService.markProcessed(event.id, event.type);
  return NextResponse.json({ received: true });
}
