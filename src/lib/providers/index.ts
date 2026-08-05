import type { ImageProvider } from "./types";
import { MockProvider } from "./mock-provider";
import { GeminiProvider } from "./gemini-provider";

export interface ImageProviderConfig {
  provider: "mock" | "gemini";
  geminiApiKey?: string;
  geminiModel?: string;
  costPerImageUsd?: number;
}

/** Construct the configured image provider. Falls back to the free mock. */
export function createImageProvider(config: ImageProviderConfig): ImageProvider {
  if (config.provider === "gemini") {
    if (!config.geminiApiKey) {
      throw new Error("IMAGE_PROVIDER=gemini requires GEMINI_API_KEY to be set.");
    }
    return new GeminiProvider({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
      costPerImageUsd: config.costPerImageUsd,
    });
  }
  return new MockProvider();
}

export * from "./types";
export { MockProvider } from "./mock-provider";
export { GeminiProvider } from "./gemini-provider";
