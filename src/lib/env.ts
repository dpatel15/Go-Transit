import { z } from "zod";

/**
 * Server-only, zod-validated environment configuration.
 *
 * Only import this from server code (route handlers, server actions, services).
 * Sensible dev defaults mean the app boots and runs in free mock mode with no
 * .env at all; production requires the secrets below to be set.
 */

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  SESSION_SECRET: z.string().min(32).optional(),

  IMAGE_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-2.5-flash-image"),

  SPEND_LIMIT_USD: z.coerce.number().positive().default(10),
  FREE_MONTHLY_CREDITS: z.coerce.number().int().nonnegative().default(30),

  MAX_UPLOAD_MB: z.coerce.number().positive().default(12),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default(".data/storage"),

  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().positive().default(60),
  RATE_LIMIT_MAX_AUTH: z.coerce.number().positive().default(10),
  RATE_LIMIT_MAX_GENERATE: z.coerce.number().positive().default(20),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. See .env.example.");
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";

/** Session signing secret. Required in production; safe dev fallback otherwise. */
export function getSessionSecret(): string {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (isProduction) {
    throw new Error("SESSION_SECRET (min 32 chars) is required in production.");
  }
  return "dev-only-insecure-secret-please-set-SESSION_SECRET-32chars";
}

export function imageProviderConfig() {
  return {
    provider: env.IMAGE_PROVIDER,
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_IMAGE_MODEL,
  } as const;
}
