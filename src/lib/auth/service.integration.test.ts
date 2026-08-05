import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestDb, type TestDb } from "@/test/db";
import { AuthError, createAuthService } from "./service";
import { createGenerationStore, createOrgAccounting } from "@/lib/generation/store";
import { verifyPassword } from "@/lib/security/password";

let testDb: TestDb;
let prisma: PrismaClient;
let auth: ReturnType<typeof createAuthService>;

beforeAll(async () => {
  testDb = createTestDb();
  prisma = testDb.prisma;
  auth = createAuthService(prisma, { freeMonthlyCredits: 30 });
}, 60000);

afterAll(async () => {
  await testDb.cleanup();
});

describe("auth: signup", () => {
  it("creates an org + owner and a working session, storing a hashed password", async () => {
    const res = await auth.signup({ email: "Owner@Example.com", password: "kankotri2026", orgName: "Rangoli Cards" });
    expect(res.org.name).toBe("Rangoli Cards");
    expect(res.user.email).toBe("owner@example.com"); // normalised
    expect(res.user.role).toBe("owner");
    expect(res.org.includedMonthlyCredits).toBe(30);

    // password is hashed, not stored in the clear
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: res.user.id } });
    expect(stored.passwordHash).not.toContain("kankotri2026");
    expect(verifyPassword("kankotri2026", stored.passwordHash)).toBe(true);

    // token resolves to the same user + org
    const ctx = await auth.getSessionUser(res.token);
    expect(ctx?.user.id).toBe(res.user.id);
    expect(ctx?.org.id).toBe(res.org.id);
  });

  it("rejects a duplicate email", async () => {
    await auth.signup({ email: "dupe@example.com", password: "kankotri2026" });
    await expect(auth.signup({ email: "dupe@example.com", password: "kankotri2026" })).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
    });
  });

  it("rejects a weak password", async () => {
    await expect(auth.signup({ email: "weak@example.com", password: "short" })).rejects.toBeInstanceOf(AuthError);
  });

  it("derives an org name from the email when none is given", async () => {
    const res = await auth.signup({ email: "meera@example.com", password: "kankotri2026" });
    expect(res.org.name).toBe("Meera's Studio");
  });
});

describe("auth: login & sessions", () => {
  it("logs in with correct credentials and rejects wrong ones", async () => {
    await auth.signup({ email: "login@example.com", password: "kankotri2026" });

    const ok = await auth.login({ email: "login@example.com", password: "kankotri2026" });
    expect(ok.token).toBeTruthy();

    await expect(auth.login({ email: "login@example.com", password: "wrongpass99" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    // unknown email yields the same generic error (no user enumeration)
    await expect(auth.login({ email: "nobody@example.com", password: "whatever99" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("logout invalidates the session", async () => {
    const res = await auth.signup({ email: "logout@example.com", password: "kankotri2026" });
    expect(await auth.getSessionUser(res.token)).not.toBeNull();
    await auth.logout(res.token);
    expect(await auth.getSessionUser(res.token)).toBeNull();
  });

  it("treats expired sessions as invalid", async () => {
    const res = await auth.signup({ email: "expire@example.com", password: "kankotri2026" });
    await prisma.session.updateMany({
      where: { userId: res.user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await auth.getSessionUser(res.token)).toBeNull();
  });

  it("returns null for a bogus token", async () => {
    expect(await auth.getSessionUser("not-a-real-token")).toBeNull();
    expect(await auth.getSessionUser(undefined)).toBeNull();
  });
});

describe("multi-tenant isolation", () => {
  it("never leaks one org's generations to another", async () => {
    const a = await auth.signup({ email: "orga@example.com", password: "kankotri2026" });
    const b = await auth.signup({ email: "orgb@example.com", password: "kankotri2026" });
    const store = createGenerationStore(prisma);

    const genA = await store.create({
      orgId: a.org.id,
      userId: a.user.id,
      provider: "mock",
      regionId: "gujarati",
      moodId: "elegant",
      aspectRatio: "4:5",
      seed: 1,
    });
    await store.create({
      orgId: b.org.id,
      userId: b.user.id,
      provider: "mock",
      regionId: "universal",
      moodId: "minimal",
      aspectRatio: "1:1",
      seed: 2,
    });

    const listA = await store.listByOrg(a.org.id);
    expect(listA).toHaveLength(1);
    expect(listA[0]!.orgId).toBe(a.org.id);

    // org B cannot fetch org A's generation by id
    expect(await store.getForOrg(b.org.id, genA.id)).toBeNull();
    expect(await store.getForOrg(a.org.id, genA.id)).not.toBeNull();
  });
});

describe("org accounting", () => {
  it("reserves and refunds credits atomically", async () => {
    const res = await auth.signup({ email: "credits@example.com", password: "kankotri2026" });
    const accounting = createOrgAccounting(prisma);

    expect(await accounting.getCreditState(res.org.id)).toMatchObject({
      includedThisMonth: 30,
      usedThisMonth: 0,
    });

    const kind = await accounting.reserveCredit(res.org.id);
    expect(kind).toBe("free");
    expect((await accounting.getCreditState(res.org.id)).usedThisMonth).toBe(1);

    await accounting.refundCredit(res.org.id, "free");
    expect((await accounting.getCreditState(res.org.id)).usedThisMonth).toBe(0);
  });

  it("never reserves more credits than exist", async () => {
    const res = await auth.signup({ email: "contention@example.com", password: "kankotri2026" });
    await prisma.organization.update({
      where: { id: res.org.id },
      data: { includedMonthlyCredits: 3, creditsUsedThisMonth: 0, purchasedCredits: 0 },
    });
    const accounting = createOrgAccounting(prisma);

    // The conditional update guards atomicity; once exhausted, reservations fail.
    const kinds: Array<string | null> = [];
    for (let i = 0; i < 5; i++) kinds.push(await accounting.reserveCredit(res.org.id));

    expect(kinds.filter((k) => k !== null)).toHaveLength(3);
    expect(kinds.slice(3)).toEqual([null, null]);
    expect((await accounting.getCreditState(res.org.id)).usedThisMonth).toBe(3);
  });

  it("computes global spend from succeeded generations only", async () => {
    const res = await auth.signup({ email: "spend@example.com", password: "kankotri2026" });
    const store = createGenerationStore(prisma);
    const accounting = createOrgAccounting(prisma);

    const before = (await accounting.getSpendState(10)).totalSpentUsd;

    const g = await store.create({
      orgId: res.org.id,
      userId: res.user.id,
      provider: "gemini",
      regionId: "gujarati",
      moodId: "elegant",
      aspectRatio: "4:5",
      seed: 3,
    });
    await store.markSucceeded(g.id, { outputKey: "k", width: 1080, height: 1350, costUsd: 0.039 });

    // a failed one must NOT count toward spend
    const f = await store.create({
      orgId: res.org.id,
      userId: res.user.id,
      provider: "gemini",
      regionId: "gujarati",
      moodId: "elegant",
      aspectRatio: "4:5",
      seed: 4,
    });
    await store.markFailed(f.id, "boom");

    const after = (await accounting.getSpendState(10)).totalSpentUsd;
    expect(after - before).toBeCloseTo(0.039, 3);
  });
});
