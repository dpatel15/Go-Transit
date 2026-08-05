/**
 * Storage keys are built from cuid ids (org/generation) plus a fixed filename,
 * e.g. `clx123/clx456/output.jpg`. Validate defensively to prevent traversal.
 */
export function assertSafeKey(key: string): void {
  if (!key || key.length > 256) {
    throw new Error("Invalid storage key");
  }
  if (key.includes("..") || key.startsWith("/") || !/^[A-Za-z0-9._/-]+$/.test(key)) {
    throw new Error("Invalid storage key");
  }
}

export function generationSourceKey(orgId: string, generationId: string): string {
  return `${orgId}/${generationId}/source.jpg`;
}

export function generationOutputKey(orgId: string, generationId: string): string {
  return `${orgId}/${generationId}/output.jpg`;
}
