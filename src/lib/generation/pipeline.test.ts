import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { PrismaClient } from "@prisma/client";
import { createTestDb, type TestDb } from "@/test/db";
import { createGenerationPipeline, PipelineError } from "./pipeline";
import { createGenerationStore, createOrgAccounting } from "./store";
import { MockProvider } from "@/lib/providers";
import { LocalStorageDriver } from "@/lib/storage";
import type { ImageProvider } from "@/lib/providers";
import type { ValidatedImage } from "@/lib/security/upload";

let testDb: TestDb;
let prisma: PrismaClient;
let storageDir: string;
let storage: LocalStorageDriver;

async function validatedImage(): Promise<ValidatedImage> {
  const data = await sharp({
    create: { width: 400, height: 600, channels: 3, background: { r: 150, g: 60, b: 40 } },
  })
    .jpeg()
    .toBuffer();
  return { data, mimeType: "image/jpeg", width: 400, height: 600, sourceFormat: "jpeg" };
}

async function makeOrgUser(suffix: string) {
  const org = await prisma.organization.create({
    data: { name: `Org ${suffix}`, slug: `org-${suffix}`, includedMonthlyCredits: 30 },
  });
  const user = await prisma.user.create({
    data: { orgId: org.id, email: `${suffix}@example.com`, passwordHash: "x" },
  });
  return { org, user };
}

beforeAll(async () => {
  testDb = createTestDb();
  prisma = testDb.prisma;
  storageDir = mkdtempSync(path.join(tmpdir(), "kankotri-storage-"));
  storage = new LocalStorageDriver(storageDir);
}, 60000);

afterAll(async () => {
  await testDb.cleanup();
  rmSync(storageDir, { recursive: true, force: true });
});

describe("generation pipeline", () => {
  it("runs the full happy path with the mock engine (free)", async () => {
    const { org, user } = await makeOrgUser("happy");
    const pipeline = createGenerationPipeline({
      provider: new MockProvider(),
      storage,
      store: createGenerationStore(prisma),
      accounting: createOrgAccounting(prisma),
      spendLimitUsd: 10,
    });

    const outcome = await pipeline.generate({
      orgId: org.id,
      userId: user.id,
      image: await validatedImage(),
      region: "gujarati",
      mood: "elegant",
      aspectRatio: "4:5",
      seed: 42,
    });

    expect(outcome.outputKey).toBe(`${org.id}/${outcome.id}/output.jpg`);
    expect(outcome.costUsd).toBe(0);
    expect(outcome.remainingCredits).toBe(29);

    // Output + source were both stored.
    expect(await storage.exists(outcome.outputKey)).toBe(true);
    expect(await storage.exists(`${org.id}/${outcome.id}/source.jpg`)).toBe(true);

    // Row is succeeded; a credit was consumed; no paid spend recorded.
    const row = await prisma.generation.findUniqueOrThrow({ where: { id: outcome.id } });
    expect(row.status).toBe("succeeded");
    const orgAfter = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(orgAfter.creditsUsedThisMonth).toBe(1);
    const spend = await createOrgAccounting(prisma).getSpendState(10);
    expect(spend.totalSpentUsd).toBe(0);
  });

  it("blocks when the org is out of credits (before creating any row)", async () => {
    const { org, user } = await makeOrgUser("nocredits");
    await prisma.organization.update({
      where: { id: org.id },
      data: { includedMonthlyCredits: 1, creditsUsedThisMonth: 1 },
    });
    const pipeline = createGenerationPipeline({
      provider: new MockProvider(),
      storage,
      store: createGenerationStore(prisma),
      accounting: createOrgAccounting(prisma),
      spendLimitUsd: 10,
    });

    await expect(
      pipeline.generate({
        orgId: org.id,
        userId: user.id,
        image: await validatedImage(),
        region: "gujarati",
        mood: "elegant",
        aspectRatio: "1:1",
      }),
    ).rejects.toMatchObject({ code: "QUOTA" });

    expect(await prisma.generation.count({ where: { orgId: org.id } })).toBe(0);
  });

  it("marks the row failed and charges nothing when the provider errors", async () => {
    const { org, user } = await makeOrgUser("provfail");
    const failing: ImageProvider = {
      name: "gemini",
      costPerImageUsd: 0.039,
      generate: async () => {
        throw new Error("simulated provider outage");
      },
    };
    const pipeline = createGenerationPipeline({
      provider: failing,
      storage,
      store: createGenerationStore(prisma),
      accounting: createOrgAccounting(prisma),
      spendLimitUsd: 10,
    });

    await expect(
      pipeline.generate({
        orgId: org.id,
        userId: user.id,
        image: await validatedImage(),
        region: "gujarati",
        mood: "elegant",
        aspectRatio: "1:1",
      }),
    ).rejects.toBeInstanceOf(PipelineError);

    const rows = await prisma.generation.findMany({ where: { orgId: org.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("failed");
    // no credit consumed, no spend
    const orgAfter = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(orgAfter.creditsUsedThisMonth).toBe(0);
  });

  it("rejects a paid generation that would exceed the global spend cap", async () => {
    const { org, user } = await makeOrgUser("overspend");
    // Push global spend to just under the $10 cap with a succeeded row.
    await prisma.generation.create({
      data: {
        orgId: org.id,
        userId: user.id,
        status: "succeeded",
        provider: "gemini",
        regionId: "gujarati",
        moodId: "elegant",
        aspectRatio: "4:5",
        seed: 1,
        costUsd: 9.99,
      },
    });
    const paidProvider: ImageProvider = {
      name: "gemini",
      costPerImageUsd: 0.039,
      generate: async () => {
        throw new Error("provider should not be called once the cap is hit");
      },
    };
    const pipeline = createGenerationPipeline({
      provider: paidProvider,
      storage,
      store: createGenerationStore(prisma),
      accounting: createOrgAccounting(prisma),
      spendLimitUsd: 10,
    });

    await expect(
      pipeline.generate({
        orgId: org.id,
        userId: user.id,
        image: await validatedImage(),
        region: "gujarati",
        mood: "elegant",
        aspectRatio: "1:1",
      }),
    ).rejects.toMatchObject({ code: "QUOTA" });

    // No credit consumed and no leftover pending row.
    const orgAfter = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(orgAfter.creditsUsedThisMonth).toBe(0);
    expect(await prisma.generation.count({ where: { orgId: org.id, status: "pending" } })).toBe(0);
  });
});
