import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Tenant-scoped persistence for generations, plus org credit/spend accounting.
 * Every read is filtered by orgId so one tenant can never see another's work.
 */
export function createGenerationStore(prisma: PrismaClient) {
  return {
    listByOrg(orgId: string, limit = 50) {
      return prisma.generation.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    },

    getForOrg(orgId: string, id: string) {
      return prisma.generation.findFirst({ where: { id, orgId } });
    },

    create(data: Prisma.GenerationUncheckedCreateInput) {
      return prisma.generation.create({ data });
    },

    markSucceeded(
      id: string,
      patch: {
        outputKey: string;
        sourceKey?: string;
        width: number;
        height: number;
        costUsd: number;
        model?: string | null;
      },
    ) {
      return prisma.generation.update({
        where: { id },
        data: { status: "succeeded", ...patch },
      });
    },

    markFailed(id: string, error: string) {
      return prisma.generation.update({
        where: { id },
        data: { status: "failed", error: error.slice(0, 500) },
      });
    },
  };
}

export type GenerationStore = ReturnType<typeof createGenerationStore>;

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function createOrgAccounting(prisma: PrismaClient) {
  /** Reset the monthly free-credit counter if the billing window has rolled over. */
  async function rolloverIfNeeded(orgId: string): Promise<void> {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    if (Date.now() - org.creditsPeriodStart.getTime() >= MONTH_MS) {
      await prisma.organization.update({
        where: { id: orgId },
        data: { creditsUsedThisMonth: 0, creditsPeriodStart: new Date() },
      });
    }
  }

  return {
    rolloverIfNeeded,

    /** Global spend across ALL tenants (the app runs on one API key + one cap). */
    async getSpendState(limitUsd: number) {
      const agg = await prisma.generation.aggregate({
        _sum: { costUsd: true },
        where: { status: "succeeded" },
      });
      return { totalSpentUsd: agg._sum.costUsd ?? 0, limitUsd };
    },

    async getCreditState(orgId: string) {
      const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
      return {
        includedThisMonth: org.includedMonthlyCredits,
        usedThisMonth: org.creditsUsedThisMonth,
        purchasedRemaining: org.purchasedCredits,
      };
    },

    /** Consume one credit atomically (free first, then purchased). */
    async consumeCredit(orgId: string): Promise<void> {
      await prisma.$transaction(async (tx) => {
        const org = await tx.organization.findUniqueOrThrow({ where: { id: orgId } });
        const freeRemaining = Math.max(0, org.includedMonthlyCredits - org.creditsUsedThisMonth);
        if (freeRemaining > 0) {
          await tx.organization.update({
            where: { id: orgId },
            data: { creditsUsedThisMonth: { increment: 1 } },
          });
        } else if (org.purchasedCredits > 0) {
          await tx.organization.update({
            where: { id: orgId },
            data: { purchasedCredits: { decrement: 1 } },
          });
        } else {
          throw new Error("No credits available to consume.");
        }
      });
    },
  };
}

export type OrgAccounting = ReturnType<typeof createOrgAccounting>;
