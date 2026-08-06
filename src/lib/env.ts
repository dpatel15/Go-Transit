import "server-only";
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

  // Stripe billing (optional — the app runs free until these are set)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_STUDIO: z.string().optional(),

  // Super-admin: comma-separated allowlist of emails that may access /admin
  SUPER_ADMIN_EMAILS: z.string().optional(),
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

/** True when Stripe billing is configured on this deployment. */
export const billingEnabled = Boolean(env.STRIPE_SECRET_KEY);

/** Resolve a plan's Stripe Price id from its env key. */
export function stripePriceForKey(key: string): string | undefined {
  switch (key) {
    case "STRIPE_PRICE_STARTER":
      return env.STRIPE_PRICE_STARTER;
    case "STRIPE_PRICE_PRO":
      return env.STRIPE_PRICE_PRO;
    case "STRIPE_PRICE_STUDIO":
      return env.STRIPE_PRICE_STUDIO;
    default:
      return undefined;
  }
}

/** Emails allowed into the super-admin area (lowercased). */
export function superAdminEmails(): string[] {
  return (env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
