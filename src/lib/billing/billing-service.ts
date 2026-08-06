import type { Prisma, PrismaClient } from "@prisma/client";
import type { BillingUpdate } from "./stripe/events";

/**
 * Database side of billing. Applies the pure reducer's BillingUpdate to the
 * right organization, refills monthly credits on renewal, and records processed
 * Stripe event ids so webhook deliveries are idempotent. Injected with Prisma.
 */
export function createBillingService(prisma: PrismaClient) {
  async function resolveOrgId(update: BillingUpdate): Promise<string | null> {
    if (update.byOrgId) return update.byOrgId;
    if (update.byCustomerId) {
      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: update.byCustomerId },
        select: { id: true },
      });
      return org?.id ?? null;
    }
    return null;
  }

  return {
    getOrg(orgId: string) {
      return prisma.organization.findUnique({ where: { id: orgId } });
    },

    setStripeCustomerId(orgId: string, stripeCustomerId: string) {
      return prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId } });
    },

    /** Apply a reducer result. Returns true if an org was updated. */
    async applyUpdate(update: BillingUpdate): Promise<boolean> {
      const orgId = await resolveOrgId(update);
      if (!orgId) return false;

      const data: Prisma.OrganizationUncheckedUpdateInput = { ...update.set };
      if (update.refillCredits) {
        data.creditsUsedThisMonth = 0;
        data.creditsPeriodStart = new Date();
      }
      await prisma.organization.update({ where: { id: orgId }, data });
      return true;
    },

    /** Idempotency: has this Stripe event id already been handled? */
    async alreadyProcessed(eventId: string): Promise<boolean> {
      const seen = await prisma.processedWebhook.findUnique({ where: { id: eventId } });
      return seen !== null;
    },

    async markProcessed(eventId: string, type: string): Promise<void> {
      // Ignore unique-constraint races — another delivery won the row.
      await prisma.processedWebhook.create({ data: { id: eventId, type } }).catch(() => {});
    },
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
