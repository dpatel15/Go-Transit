import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

/**
 * Single PrismaClient instance, reused across hot-reloads in dev so we don't
 * exhaust database connections. Services accept a PrismaClient by dependency
 * injection (see createAuthService etc.), so tests can pass a throwaway client
 * pointed at a temp database — this singleton is for the running app.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Use the zod-resolved URL (with its dev default) rather than relying on
    // process.env, which Prisma would otherwise read directly.
    datasources: { db: { url: env.DATABASE_URL } },
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
