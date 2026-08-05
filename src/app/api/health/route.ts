import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    imageProvider: env.IMAGE_PROVIDER,
    spendLimitUsd: env.SPEND_LIMIT_USD,
  });
}
