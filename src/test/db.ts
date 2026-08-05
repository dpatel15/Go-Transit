import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * Provision a throwaway SQLite database for integration tests: make a temp dir,
 * push the Prisma schema into it, and return a client pointed at it plus a
 * cleanup function. Not a *.test.ts file, so Vitest won't collect it.
 */
export interface TestDb {
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}

export function createTestDb(): TestDb {
  const dir = mkdtempSync(path.join(tmpdir(), "kankotri-test-"));
  const dbPath = path.join(dir, "test.db");
  const url = `file:${dbPath}`;

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });

  const prisma = new PrismaClient({ datasources: { db: { url } } });

  return {
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
