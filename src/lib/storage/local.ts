import { promises as fs } from "node:fs";
import path from "node:path";
import { assertSafeKey } from "./keys";
import type { StorageDriver } from "./types";

/** Local-disk storage driver for dev and single-node deployments. */
export class LocalStorageDriver implements StorageDriver {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  private resolve(key: string): string {
    assertSafeKey(key);
    const full = path.resolve(this.baseDir, key);
    if (full !== this.baseDir && !full.startsWith(this.baseDir + path.sep)) {
      throw new Error("Resolved path escapes the storage root");
    }
    return full;
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch {
      // already gone — fine
    }
  }
}
