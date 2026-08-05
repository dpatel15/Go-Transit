import { LocalStorageDriver } from "./local";
import type { StorageDriver } from "./types";

export interface StorageConfig {
  driver: "local" | "s3";
  localDir: string;
}

export function createStorage(config: StorageConfig): StorageDriver {
  if (config.driver === "s3") {
    // Intentionally explicit: wire an S3/R2 driver here for production at scale.
    throw new Error("S3 storage driver is not implemented yet. Use STORAGE_DRIVER=local.");
  }
  return new LocalStorageDriver(config.localDir);
}

export * from "./types";
export { LocalStorageDriver } from "./local";
export { assertSafeKey, generationSourceKey, generationOutputKey } from "./keys";
