import "server-only";
import { prisma } from "@/lib/db/client";
import { env, imageProviderConfig } from "@/lib/env";
import { createAuthService } from "@/lib/auth/service";
import { createImageProvider } from "@/lib/providers";
import { createStorage } from "@/lib/storage";
import { createGenerationStore, createOrgAccounting } from "@/lib/generation/store";
import { createGenerationPipeline } from "@/lib/generation/pipeline";
import { RateLimiter } from "@/lib/security/rate-limit";

/**
 * App-wide singletons wired from validated env. Route handlers, server actions
 * and server components import from here. (Tests build their own instances with
 * injected dependencies instead of importing this module.)
 */

export const authService = createAuthService(prisma, {
  freeMonthlyCredits: env.FREE_MONTHLY_CREDITS,
});

export const storage = createStorage({
  driver: env.STORAGE_DRIVER,
  localDir: env.LOCAL_STORAGE_DIR,
});

export const generationStore = createGenerationStore(prisma);
export const orgAccounting = createOrgAccounting(prisma);

/** Build the configured provider on demand (throws clearly if misconfigured). */
export function getImageProvider() {
  return createImageProvider(imageProviderConfig());
}

export function getPipeline() {
  return createGenerationPipeline({
    prisma,
    provider: getImageProvider(),
    storage,
    store: generationStore,
    accounting: orgAccounting,
    spendLimitUsd: env.SPEND_LIMIT_USD,
  });
}

const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
export const authRateLimiter = new RateLimiter({ windowMs, max: env.RATE_LIMIT_MAX_AUTH });
export const generateRateLimiter = new RateLimiter({ windowMs, max: env.RATE_LIMIT_MAX_GENERATE });
