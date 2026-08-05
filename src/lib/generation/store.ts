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
      // Zeroing costUsd releases the in-flight spend estimate this row reserved.
      return prisma.generation.update({
        where: { id },
        data: { status: "failed", error: error.slice(0, 500), costUsd: 0 },
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

    /**
     * Global spend across ALL tenants (the app runs on one API key + one cap).
     * Counts BOTH in-flight (pending) and succeeded rows, so concurrent paid
     * generations see each other's reserved estimate and can't overshoot the cap.
     */
    async getSpendState(limitUsd: number) {
      const agg = await prisma.generation.aggregate({
        _sum: { costUsd: true },
        where: { status: { in: ["pending", "succeeded"] } },
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

    /**
     * Atomically reserve one credit (free first, then purchased) using a guarded
     * conditional update — so N concurrent requests can never consume more than
     * the available credits. Returns which pool was used, or null if none left.
     */
    async reserveCredit(orgId: string): Promise<CreditReservation> {
      const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
      const free = await prisma.organization.updateMany({
        where: { id: orgId, creditsUsedThisMonth: { lt: org.includedMonthlyCredits } },
        data: { creditsUsedThisMonth: { increment: 1 } },
      });
      if (free.count === 1) return "free";
      const purchased = await prisma.organization.updateMany({
        where: { id: orgId, purchasedCredits: { gt: 0 } },
        data: { purchasedCredits: { decrement: 1 } },
      });
      if (purchased.count === 1) return "purchased";
      return null;
    },

    /** Release a previously reserved credit (on failure or over-cap). */
    async refundCredit(orgId: string, kind: "free" | "purchased"): Promise<void> {
      if (kind === "free") {
        await prisma.organization.updateMany({
          where: { id: orgId, creditsUsedThisMonth: { gt: 0 } },
          data: { creditsUsedThisMonth: { decrement: 1 } },
        });
      } else {
        await prisma.organization.update({
          where: { id: orgId },
          data: { purchasedCredits: { increment: 1 } },
        });
      }
    },
  };
}

export type CreditReservation = "free" | "purchased" | null;

export type OrgAccounting = ReturnType<typeof createOrgAccounting>;
