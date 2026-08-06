import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { adminService } from "@/lib/server/services";
import { SiteHeader } from "@/components/site-header";
import { PLANS } from "@/lib/billing/plans";
import { formatUsd } from "@/lib/utils";
import { grantCreditsAction, setPlanAction } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireSuperAdmin();
  const [orgs, totalSpend] = await Promise.all([adminService.listOrgs(), adminService.totalSpend()]);

  return (
    <>
      <SiteHeader />
      <main className="container-page py-10">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted">
          {orgs.length} organisation{orgs.length === 1 ? "" : "s"} · {formatUsd(totalSpend)} total estimated spend
        </p>

        <div className="mt-6 overflow-x-auto rounded-xl border border-ink/10">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Studio</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Users</th>
                <th className="px-4 py-3 font-medium">Posts</th>
                <th className="px-4 py-3 font-medium">Spend</th>
                <th className="px-4 py-3 font-medium">Manage</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const remaining =
                  Math.max(0, o.includedMonthlyCredits - o.creditsUsedThisMonth) + o.purchasedCredits;
                return (
                  <tr key={o.id} className="border-b border-ink/5 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{o.name}</div>
                      <div className="text-xs text-muted">{o.slug}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{o.plan}</td>
                    <td className="px-4 py-3">
                      {remaining} left
                      <div className="text-xs text-muted">
                        {o.creditsUsedThisMonth}/{o.includedMonthlyCredits} used · +{o.purchasedCredits} extra
                      </div>
                    </td>
                    <td className="px-4 py-3">{o.subscriptionStatus ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{o.userCount}</td>
                    <td className="px-4 py-3 tabular-nums">{o.generationCount}</td>
                    <td className="px-4 py-3 tabular-nums">{formatUsd(o.spendUsd)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <form action={grantCreditsAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="orgId" value={o.id} />
                          <input
                            name="amount"
                            type="number"
                            min="1"
                            placeholder="+ credits"
                            className="w-24 rounded-lg border border-ink/15 bg-white px-2 py-1 text-sm"
                          />
                          <button className="btn-outline px-3 py-1 text-xs" type="submit">
                            Grant
                          </button>
                        </form>
                        <form action={setPlanAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="orgId" value={o.id} />
                          <select
                            name="planId"
                            defaultValue={o.plan}
                            className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-sm"
                          >
                            {PLANS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <button className="btn-outline px-3 py-1 text-xs" type="submit">
                            Set
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
