import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getCurrentSession } from "@/lib/auth/session";
import { getPipeline, generateRateLimiter } from "@/lib/server/services";
import { getClientIp } from "@/lib/http/ip";
import { DEFAULT_UPLOAD_LIMITS, validateAndNormalizeUpload } from "@/lib/security/upload";
import { isAspectRatioId, isMoodId, isRegionId } from "@/lib/prompt";
import { PipelineError } from "@/lib/generation/pipeline";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in to generate." }, { status: 401 });
  }

  // Defense-in-depth CSRF: reject cross-origin POSTs (cookie is SameSite=Lax too).
  const origin = req.headers.get("origin");
  if (origin) {
    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === req.headers.get("host");
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }
  }

  const ip = await getClientIp();
  if (!generateRateLimiter.check(`generate:${session.user.id}:${ip}`).allowed) {
    return NextResponse.json({ error: "You're generating too quickly — give it a moment." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please attach a photo of the card." }, { status: 400 });
  }
  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `Image is too large (max ${env.MAX_UPLOAD_MB} MB).` }, { status: 413 });
  }

  const region = String(form.get("region") ?? "");
  const mood = String(form.get("mood") ?? "");
  const aspectRatio = String(form.get("aspectRatio") ?? "");
  if (!isRegionId(region) || !isMoodId(mood) || !isAspectRatioId(aspectRatio)) {
    return NextResponse.json({ error: "Please choose a valid region, mood and size." }, { status: 400 });
  }
  const notesRaw = form.get("notes");
  const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw : undefined;
  const seedRaw = form.get("seed");
  const seedNum = seedRaw ? Number(seedRaw) : undefined;
  const seed = typeof seedNum === "number" && Number.isFinite(seedNum) ? seedNum : undefined;

  const bytes = Buffer.from(await file.arrayBuffer());
  const validation = await validateAndNormalizeUpload(bytes, { ...DEFAULT_UPLOAD_LIMITS, maxBytes });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const outcome = await getPipeline().generate({
      orgId: session.org.id,
      userId: session.user.id,
      image: validation.image,
      region,
      mood,
      aspectRatio,
      seed,
      notes,
    });

    return NextResponse.json({
      id: outcome.id,
      outputUrl: `/api/assets/${outcome.outputKey}`,
      downloadUrl: `/api/assets/${outcome.outputKey}?download=1`,
      width: outcome.width,
      height: outcome.height,
      provider: outcome.provider,
      costUsd: outcome.costUsd,
      seed: outcome.seedUsed,
      remainingCredits: outcome.remainingCredits,
      region: outcome.region,
      mood: outcome.mood,
      aspectRatio: outcome.aspectRatio,
    });
  } catch (err) {
    if (err instanceof PipelineError) {
      if (err.code === "QUOTA") {
        // Quota messages are safe, user-facing text (spend cap / out of credits).
        return NextResponse.json({ error: err.message, code: err.code }, { status: 402 });
      }
      // The provider yields safe, key-redacted messages; surface a trimmed
      // version so setup issues (billing/quota/model/storage) are diagnosable.
      console.error("generation pipeline error:", err.code, err.message);
      return NextResponse.json({ error: err.message.slice(0, 300), code: err.code }, { status: 502 });
    }
    console.error("generation failed:", err);
    return NextResponse.json({ error: "Generation failed unexpectedly. Please try again." }, { status: 500 });
  }
}
