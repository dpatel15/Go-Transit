import type { PrismaClient } from "@prisma/client";
import { authorizeGeneration } from "@/lib/billing/spend-guard";
import { buildPrompt } from "@/lib/prompt";
import type { AspectRatioId, MoodId, RegionId } from "@/lib/prompt";
import type { ImageProvider } from "@/lib/providers";
import type { StorageDriver } from "@/lib/storage";
import { generationOutputKey, generationSourceKey } from "@/lib/storage";
import type { ValidatedImage } from "@/lib/security/upload";
import type { GenerationStore, OrgAccounting } from "./store";

export type PipelineErrorCode = "QUOTA" | "PROVIDER" | "INTERNAL";

export class PipelineError extends Error {
  constructor(public readonly code: PipelineErrorCode, message: string) {
    super(message);
    this.name = "PipelineError";
  }
}

export interface GenerationPipelineDeps {
  prisma: PrismaClient;
  provider: ImageProvider;
  storage: StorageDriver;
  store: GenerationStore;
  accounting: OrgAccounting;
  spendLimitUsd: number;
}

export interface GenerateRequest {
  orgId: string;
  userId: string;
  image: ValidatedImage;
  region: RegionId;
  mood: MoodId;
  aspectRatio: AspectRatioId;
  seed?: number;
  notes?: string;
}

export interface GenerateOutcome {
  id: string;
  outputKey: string;
  provider: string;
  model?: string | null;
  costUsd: number;
  seedUsed: number;
  region: RegionId;
  mood: MoodId;
  aspectRatio: AspectRatioId;
  width: number;
  height: number;
  remainingCredits: number;
  remainingUsd: number;
}

/**
 * The end-to-end generation flow: gate on credits + spend, persist a pending
 * row, store the source, call the provider, store the output, then record
 * success + consume one credit. Any provider failure marks the row failed and
 * surfaces a typed error — no credit is charged and no spend is recorded.
 */
export function createGenerationPipeline(deps: GenerationPipelineDeps) {
  async function generate(req: GenerateRequest): Promise<GenerateOutcome> {
    const { orgId, userId } = req;

    await deps.accounting.rolloverIfNeeded(orgId);
    const [credit, spend] = await Promise.all([
      deps.accounting.getCreditState(orgId),
      deps.accounting.getSpendState(deps.spendLimitUsd),
    ]);

    const authz = authorizeGeneration({
      costUsd: deps.provider.costPerImageUsd,
      spend,
      credit,
    });
    if (!authz.allowed) {
      throw new PipelineError("QUOTA", authz.reason ?? "Generation not allowed.");
    }

    const prompt = buildPrompt({
      region: req.region,
      mood: req.mood,
      aspectRatio: req.aspectRatio,
      seed: req.seed,
      notes: req.notes,
    });

    const gen = await deps.store.create({
      orgId,
      userId,
      status: "pending",
      provider: deps.provider.name,
      regionId: req.region,
      moodId: req.mood,
      aspectRatio: req.aspectRatio,
      seed: prompt.seedUsed,
    });

    try {
      const sourceKey = generationSourceKey(orgId, gen.id);
      await deps.storage.put(sourceKey, req.image.data, req.image.mimeType);

      const result = await deps.provider.generate({
        image: { data: req.image.data, mimeType: req.image.mimeType },
        prompt: prompt.prompt,
        negativePrompt: prompt.negativePrompt,
        target: { width: prompt.target.width, height: prompt.target.height },
        seed: prompt.seedUsed,
      });

      const outputKey = generationOutputKey(orgId, gen.id);
      await deps.storage.put(outputKey, result.data, result.mimeType);

      await deps.store.markSucceeded(gen.id, {
        outputKey,
        sourceKey,
        width: prompt.target.width,
        height: prompt.target.height,
        costUsd: result.costUsd,
        model: result.model ?? null,
      });
      await deps.accounting.consumeCredit(orgId);

      return {
        id: gen.id,
        outputKey,
        provider: result.provider,
        model: result.model ?? null,
        costUsd: result.costUsd,
        seedUsed: prompt.seedUsed,
        region: req.region,
        mood: req.mood,
        aspectRatio: req.aspectRatio,
        width: prompt.target.width,
        height: prompt.target.height,
        remainingCredits: Math.max(0, authz.remainingCredits - 1),
        remainingUsd: authz.remainingUsd,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      await deps.store.markFailed(gen.id, message).catch(() => {});
      throw new PipelineError("PROVIDER", message);
    }
  }

  return { generate };
}

export type GenerationPipeline = ReturnType<typeof createGenerationPipeline>;
