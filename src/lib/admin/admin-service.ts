import type { PrismaClient } from "@prisma/client";

/** Read/side-effect operations backing the super-admin dashboard. */
export function createAdminService(prisma: PrismaClient) {
  return {
    async listOrgs(limit = 200) {
      const [orgs, spendRows] = await Promise.all([
        prisma.organization.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          include: { _count: { select: { users: true, generations: true } } },
        }),
        prisma.generation.groupBy({
          by: ["orgId"],
          where: { status: "succeeded" },
          _sum: { costUsd: true },
        }),
      ]);
      const spendByOrg = new Map(spendRows.map((r) => [r.orgId, r._sum.costUsd ?? 0]));
      return orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        plan: o.plan,
        includedMonthlyCredits: o.includedMonthlyCredits,
        creditsUsedThisMonth: o.creditsUsedThisMonth,
        purchasedCredits: o.purchasedCredits,
        subscriptionStatus: o.subscriptionStatus,
        createdAt: o.createdAt,
        userCount: o._count.users,
        generationCount: o._count.generations,
        spendUsd: spendByOrg.get(o.id) ?? 0,
      }));
    },

    async totalSpend() {
      const agg = await prisma.generation.aggregate({
        _sum: { costUsd: true },
        where: { status: { in: ["pending", "succeeded"] } },
      });
      return agg._sum.costUsd ?? 0;
    },

    grantCredits(orgId: string, amount: number) {
      const safe = Math.max(0, Math.floor(amount));
      return prisma.organization.update({
        where: { id: orgId },
        data: { purchasedCredits: { increment: safe } },
      });
    },

    setPlan(orgId: string, planId: string, monthlyCredits: number) {
      return prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: planId,
          includedMonthlyCredits: monthlyCredits,
          creditsUsedThisMonth: 0,
          creditsPeriodStart: new Date(),
        },
      });
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
