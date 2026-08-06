import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestDb, type TestDb } from "@/test/db";
import { createBillingService } from "./billing-service";

let testDb: TestDb;
let prisma: PrismaClient;
let svc: ReturnType<typeof createBillingService>;

beforeAll(async () => {
  testDb = createTestDb();
  prisma = testDb.prisma;
  svc = createBillingService(prisma);
}, 60000);

afterAll(async () => {
  await testDb.cleanup();
});

function mkOrg(suffix: string, data: Record<string, unknown> = {}) {
  return prisma.organization.create({
    data: { name: `Org ${suffix}`, slug: `org-${suffix}`, includedMonthlyCredits: 30, ...data },
  });
}

describe("billing service", () => {
  it("links a customer by org id, then resolves it by customer id later", async () => {
    const org = await mkOrg("link");
    const linked = await svc.applyUpdate({
      byOrgId: org.id,
      set: { stripeCustomerId: "cus_link", plan: "pro", includedMonthlyCredits: 600, subscriptionStatus: "active" },
    });
    expect(linked).toBe(true);

    const after = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(after.stripeCustomerId).toBe("cus_link");
    expect(after.plan).toBe("pro");
    expect(after.includedMonthlyCredits).toBe(600);

    // A later event addressed only by customer id now resolves.
    expect(await svc.applyUpdate({ byCustomerId: "cus_link", set: { subscriptionStatus: "past_due" } })).toBe(true);
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })).subscriptionStatus).toBe("past_due");
  });

  it("returns false when no org matches the customer", async () => {
    expect(await svc.applyUpdate({ byCustomerId: "cus_unknown", set: { subscriptionStatus: "active" } })).toBe(false);
  });

  it("refills the monthly credit counter on renewal", async () => {
    const org = await mkOrg("refill", { stripeCustomerId: "cus_refill", creditsUsedThisMonth: 20 });
    await svc.applyUpdate({ byCustomerId: "cus_refill", set: { subscriptionStatus: "active" }, refillCredits: true });
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })).creditsUsedThisMonth).toBe(0);
  });

  it("dedupes processed webhook ids idempotently", async () => {
    expect(await svc.alreadyProcessed("evt_x")).toBe(false);
    await svc.markProcessed("evt_x", "invoice.paid");
    expect(await svc.alreadyProcessed("evt_x")).toBe(true);
    await svc.markProcessed("evt_x", "invoice.paid"); // second delivery must not throw
  });
});
