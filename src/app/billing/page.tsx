import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { billingService } from "@/lib/server/services";
import { SiteHeader } from "@/components/site-header";
import { PLANS } from "@/lib/billing/plans";
import { billingEnabled, stripePriceForKey } from "@/lib/env";
import { BillingClient } from "@/components/billing/billing-client";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  const { status } = await searchParams;
  const org = await billingService.getOrg(session.org.id);

  const remaining = org
    ? Math.max(0, org.includedMonthlyCredits - org.creditsUsedThisMonth) + org.purchasedCredits
    : 0;

  const plans = PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    blurb: p.blurb,
    monthlyCredits: p.monthlyCredits,
    paid: p.paid,
    configured: p.paid ? Boolean(p.priceEnvKey && stripePriceForKey(p.priceEnvKey)) : true,
  }));

  return (
    <>
      <SiteHeader />
      <main className="container-page py-10">
        <BillingClient
          currentPlan={org?.plan ?? "free"}
          remainingCredits={remaining}
          subscriptionStatus={org?.subscriptionStatus ?? null}
          hasBillingAccount={Boolean(org?.stripeCustomerId)}
          billingEnabled={billingEnabled}
          isOwner={session.user.role === "owner"}
          plans={plans}
          status={status ?? null}
        />
      </main>
    </>
  );
}
