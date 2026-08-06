"use client";

import { useState } from "react";

interface PlanView {
  id: string;
  name: string;
  blurb: string;
  monthlyCredits: number;
  paid: boolean;
  configured: boolean;
}

export function BillingClient({
  currentPlan,
  remainingCredits,
  subscriptionStatus,
  hasBillingAccount,
  billingEnabled,
  isOwner,
  plans,
  status,
}: {
  currentPlan: string;
  remainingCredits: number;
  subscriptionStatus: string | null;
  hasBillingAccount: boolean;
  billingEnabled: boolean;
  isOwner: boolean;
  plans: PlanView[];
  status: string | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(url: string, body?: unknown) {
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again.");
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Plan &amp; billing</h1>
      <p className="mt-1 text-sm text-muted">
        You have <span className="font-medium text-ink">{remainingCredits}</span> credit
        {remainingCredits === 1 ? "" : "s"} left this month on the{" "}
        <span className="capitalize">{currentPlan}</span> plan
        {subscriptionStatus ? ` · ${subscriptionStatus}` : ""}.
      </p>

      {status === "success" && (
        <p className="mt-4 rounded-lg border border-ink/10 bg-cream px-4 py-3 text-sm text-ink/80">
          Thanks — your subscription is active. Credits update within a few seconds.
        </p>
      )}
      {status === "canceled" && (
        <p className="mt-4 rounded-lg border border-ink/10 bg-cream px-4 py-3 text-sm text-ink/80">
          Checkout canceled — no charge was made.
        </p>
      )}
      {!billingEnabled && (
        <p className="mt-4 rounded-lg border border-ink/10 bg-cream px-4 py-3 text-sm text-ink/80">
          Billing isn&rsquo;t switched on for this deployment yet. Everything runs on the free plan.
        </p>
      )}
      {error && <p className="mt-4 rounded-lg bg-maroon/10 px-4 py-3 text-sm text-maroon">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlan;
          return (
            <div key={p.id} className={"card-surface p-5" + (isCurrent ? " ring-2 ring-maroon/25" : "")}>
              <h3 className="font-display text-lg font-semibold text-ink">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.blurb}</p>
              <p className="mt-3 text-sm text-ink">{p.monthlyCredits} credits / month</p>
              <div className="mt-4">
                {isCurrent ? (
                  <span className="inline-flex rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-muted">
                    Current plan
                  </span>
                ) : !p.paid ? (
                  <span className="inline-flex rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-muted">
                    Free
                  </span>
                ) : !billingEnabled || !p.configured ? (
                  <span className="inline-flex rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-muted">
                    Coming soon
                  </span>
                ) : !isOwner ? (
                  <span className="text-xs text-muted">Owner only</span>
                ) : (
                  <button
                    type="button"
                    className="btn-primary px-4 py-2 text-sm"
                    disabled={busy === p.id}
                    onClick={() => {
                      setBusy(p.id);
                      void go("/api/billing/checkout", { planId: p.id }).finally(() => setBusy(null));
                    }}
                  >
                    {busy === p.id ? "…" : "Choose"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasBillingAccount && isOwner && (
        <div className="mt-6">
          <button
            type="button"
            className="btn-outline"
            disabled={busy === "manage"}
            onClick={() => {
              setBusy("manage");
              void go("/api/billing/portal").finally(() => setBusy(null));
            }}
          >
            {busy === "manage" ? "…" : "Manage billing"}
          </button>
        </div>
      )}
    </div>
  );
}
