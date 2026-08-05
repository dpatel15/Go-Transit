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
  /** Optional style-reference images (their content is never reproduced). */
  references?: ValidatedImage[];
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The end-to-end generation flow, hardened against concurrency:
 *   1. optional cheap spend pre-check;
 *   2. ATOMIC credit reservation (guarded conditional update) — N concurrent
 *      requests can never consume more than the credits that exist;
 *   3. create a pending row carrying the estimated cost, so in-flight spend is
 *      visible to every other request;
 *   4. authoritative spend re-check against the committed total; over-cap
 *      releases the reservation;
 *   5. do the work; on ANY failure, mark failed (releasing the spend estimate)
 *      and refund the credit — so a failed paid call never leaves phantom spend
 *      and never burns a credit.
 */
export function createGenerationPipeline(deps: GenerationPipelineDeps) {
  const limit = deps.spendLimitUsd;
  const spendMessage = () =>
    `Spend limit of $${limit.toFixed(2)} reached. Raise SPEND_LIMIT_USD to continue with paid generations.`;

  async function generate(req: GenerateRequest): Promise<GenerateOutcome> {
    const { orgId, userId } = req;
    const estimatedCost = deps.provider.costPerImageUsd;

    await deps.accounting.rolloverIfNeeded(orgId);

    // (1) Cheap early reject before we reserve anything.
    if (estimatedCost > 0) {
      const spend = await deps.accounting.getSpendState(limit);
      if (spend.totalSpentUsd + estimatedCost > limit + 1e-9) {
        throw new PipelineError("QUOTA", spendMessage());
      }
    }

    // (2) Reserve a credit atomically before any work happens.
    const reserved = await deps.accounting.reserveCredit(orgId);
    if (!reserved) {
      throw new PipelineError("QUOTA", "You've used all your credits for this month.");
    }

    const prompt = buildPrompt({
      region: req.region,
      mood: req.mood,
      aspectRatio: req.aspectRatio,
      seed: req.seed,
      notes: req.notes,
      referenceCount: req.references?.length ?? 0,
    });

    // (3) Commit a pending row carrying the estimated cost.
    let genId: string;
    try {
      const gen = await deps.store.create({
        orgId,
        userId,
        status: "pending",
        provider: deps.provider.name,
        regionId: req.region,
        moodId: req.mood,
        aspectRatio: req.aspectRatio,
        seed: prompt.seedUsed,
        costUsd: estimatedCost,
      });
      genId = gen.id;
    } catch (err) {
      await deps.accounting.refundCredit(orgId, reserved).catch(() => {});
      throw new PipelineError("INTERNAL", err instanceof Error ? err.message : "Could not start generation.");
    }

    // (4) Authoritative spend check now that our estimate is committed & visible.
    if (estimatedCost > 0) {
      const spend = await deps.accounting.getSpendState(limit);
      if (spend.totalSpentUsd > limit + 1e-9) {
        await deps.store.markFailed(genId, "Spend limit reached").catch(() => {});
        await deps.accounting.refundCredit(orgId, reserved).catch(() => {});
        throw new PipelineError("QUOTA", spendMessage());
      }
    }

    // (5) Do the work; release everything on failure.
    try {
      const sourceKey = generationSourceKey(orgId, genId);
      await deps.storage.put(sourceKey, req.image.data, req.image.mimeType);

      const result = await deps.provider.generate({
        image: { data: req.image.data, mimeType: req.image.mimeType },
        references: req.references?.map((r) => ({ data: r.data, mimeType: r.mimeType })),
        prompt: prompt.prompt,
        negativePrompt: prompt.negativePrompt,
        target: { width: prompt.target.width, height: prompt.target.height },
        seed: prompt.seedUsed,
      });

      const outputKey = generationOutputKey(orgId, genId);
      await deps.storage.put(outputKey, result.data, result.mimeType);

      await deps.store.markSucceeded(genId, {
        outputKey,
        sourceKey,
        width: prompt.target.width,
        height: prompt.target.height,
        costUsd: result.costUsd,
        model: result.model ?? null,
      });

      const [creditState, spendState] = await Promise.all([
        deps.accounting.getCreditState(orgId),
        deps.accounting.getSpendState(limit),
      ]);
      const remainingCredits =
        Math.max(0, creditState.includedThisMonth - creditState.usedThisMonth) +
        (creditState.purchasedRemaining ?? 0);

      return {
        id: genId,
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
        remainingCredits,
        remainingUsd: Math.max(0, round2(limit - spendState.totalSpentUsd)),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      await deps.store.markFailed(genId, message).catch(() => {});
      await deps.accounting.refundCredit(orgId, reserved).catch(() => {});
      throw new PipelineError("PROVIDER", message);
    }
  }

  return { generate };
}

export type GenerationPipeline = ReturnType<typeof createGenerationPipeline>;
