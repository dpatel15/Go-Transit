import sharp from "sharp";
import type { GenerateImageParams, GeneratedImage, ImageProvider } from "./types";

export interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  costPerImageUsd?: number;
  /** Injectable for testing; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

interface GeminiInlinePart {
  mimeType?: string;
  mime_type?: string;
  data?: string;
}
interface GeminiPart {
  text?: string;
  inlineData?: GeminiInlinePart;
  inline_data?: GeminiInlinePart;
}
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
}

/** Pull the first image payload out of a Gemini response (camel or snake case). */
function extractImageBase64(json: GeminiResponse): string | null {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) return inline.data;
  }
  return null;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no response body>";
  }
}

/** Never let the API key appear in an error message or log line. */
function redact(text: string, secret: string): string {
  if (!secret) return text;
  return text.split(secret).join("***");
}

/** Map an HTTP status to a safe, actionable hint (no raw upstream body). */
function friendlyStatus(status: number): string {
  if (status === 400) return `the request was rejected (400) — the model may not accept this input`;
  if (status === 401 || status === 403) {
    return `the API key was rejected or lacks access to image generation (${status}) — check the key, and that the Generative Language API and billing are enabled for its project`;
  }
  if (status === 404) return `the image model was not found (404) — check the GEMINI_IMAGE_MODEL setting`;
  if (status === 429) {
    return `the image quota / rate limit was hit (429) — a brand-new key often has no image-generation quota until billing is enabled; enable billing or wait and retry`;
  }
  if (status >= 500) return `the image service had a temporary error (${status}) — please retry in a moment`;
  return `the image service returned an error (${status})`;
}

/**
 * GeminiProvider — real generation via Gemini 2.5 Flash Image ("Nano Banana").
 *
 * Security notes:
 *  - the API key travels in the `x-goog-api-key` header, never in the URL
 *    (so it can't leak via request logs / referrers);
 *  - error bodies are redacted before they surface anywhere.
 */
export class GeminiProvider implements ImageProvider {
  readonly name = "gemini";
  readonly costPerImageUsd: number;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: GeminiProviderOptions) {
    if (!opts.apiKey) throw new Error("GeminiProvider requires an API key");
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? "gemini-2.5-flash-image";
    this.baseUrl = opts.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    this.costPerImageUsd = opts.costPerImageUsd ?? 0.039;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async generate(params: GenerateImageParams): Promise<GeneratedImage> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent`;
    const promptText = params.negativePrompt
      ? `${params.prompt}\n\nAvoid the following: ${params.negativePrompt}.`
      : params.prompt;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText },
            { inlineData: { mimeType: params.image.mimeType, data: params.image.data.toString("base64") } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        ...(params.seed !== undefined ? { seed: params.seed } : {}),
      },
    };

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Gemini request failed: ${redact((err as Error).message, this.apiKey)}`);
    }

    if (!res.ok) {
      // Log the full (redacted) detail server-side for debugging…
      const detail = redact(await safeText(res), this.apiKey);
      console.error(`Gemini API error ${res.status}:`, detail.slice(0, 800));
      // …but only surface a safe, actionable hint (no raw upstream body).
      throw new Error(`Gemini image generation failed: ${friendlyStatus(res.status)}.`);
    }

    const json = (await res.json()) as GeminiResponse;
    const blockReason = json.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Gemini blocked the request (${blockReason}).`);
    }

    const b64 = extractImageBase64(json);
    if (!b64) {
      throw new Error("Gemini returned no image (it may have been blocked by safety filters).");
    }

    // Normalise to the exact requested Instagram dimensions.
    const data = await sharp(Buffer.from(b64, "base64"))
      .resize(params.target.width, params.target.height, { fit: "cover" })
      .jpeg({ quality: 90 })
      .toBuffer();

    return {
      data,
      mimeType: "image/jpeg",
      provider: this.name,
      model: this.model,
      costUsd: this.costPerImageUsd,
      seed: params.seed,
    };
  }
}
