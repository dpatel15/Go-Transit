import { NextResponse } from "next/server";
import { env, stripePriceForKey } from "@/lib/env";
import { getCurrentSession } from "@/lib/auth/session";
import { stripeGateway, billingService } from "@/lib/server/services";
import { getPlan } from "@/lib/billing/plans";
import { isSameOrigin } from "@/lib/http/origin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.user.role !== "owner") {
    return NextResponse.json({ error: "Only the account owner can manage billing." }, { status: 403 });
  }
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  if (!stripeGateway.enabled) {
    return NextResponse.json({ error: "Billing isn't set up on this deployment yet." }, { status: 503 });
  }

  let body: { planId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const plan = getPlan(typeof body.planId === "string" ? body.planId : "");
  if (!plan || !plan.paid || !plan.priceEnvKey) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
  }
  const priceId = stripePriceForKey(plan.priceEnvKey);
  if (!priceId) {
    return NextResponse.json({ error: `The ${plan.name} plan isn't configured yet.` }, { status: 503 });
  }

  const org = await billingService.getOrg(session.org.id);
  try {
    const { url } = await stripeGateway.createCheckoutSession({
      priceId,
      orgId: session.org.id,
      successUrl: `${env.APP_URL}/billing?status=success`,
      cancelUrl: `${env.APP_URL}/billing?status=canceled`,
      customerId: org?.stripeCustomerId ?? undefined,
      customerEmail: org?.stripeCustomerId ? undefined : session.user.email,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("checkout error:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
