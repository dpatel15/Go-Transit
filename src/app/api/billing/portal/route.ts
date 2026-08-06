import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getCurrentSession } from "@/lib/auth/session";
import { stripeGateway, billingService } from "@/lib/server/services";
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

  const org = await billingService.getOrg(session.org.id);
  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account yet — subscribe to a plan first." }, { status: 400 });
  }
  try {
    const { url } = await stripeGateway.createPortalSession({
      customerId: org.stripeCustomerId,
      returnUrl: `${env.APP_URL}/billing`,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("portal error:", err);
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 502 });
  }
}
