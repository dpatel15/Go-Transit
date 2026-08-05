/**
 * Image provider abstraction. Every engine (mock, Gemini, and future ones like
 * OpenAI or Vertex) implements the same tiny interface, so the rest of the app
 * never depends on a specific vendor and providers can be swapped via config.
 */

export interface SourceImage {
  /** Raw bytes of the user's card photo (already validated & re-encoded). */
  data: Buffer;
  mimeType: string;
}

export interface GenerateImageParams {
  image: SourceImage;
  /** Optional style/scene inspiration images (their content is never copied). */
  references?: SourceImage[];
  prompt: string;
  negativePrompt?: string;
  /** Exact output dimensions (Instagram size for the chosen aspect ratio). */
  target: { width: number; height: number };
  seed?: number;
}

export interface GeneratedImage {
  data: Buffer;
  mimeType: string;
  /** Provider name, e.g. "mock" or "gemini". */
  provider: string;
  model?: string;
  /** Estimated cost of THIS generation, in USD (0 for the mock engine). */
  costUsd: number;
  seed?: number;
  meta?: Record<string, unknown>;
}

export interface ImageProvider {
  readonly name: string;
  /** Estimated USD cost per generated image (used by the spend guard). */
  readonly costPerImageUsd: number;
  generate(params: GenerateImageParams): Promise<GeneratedImage>;
}
