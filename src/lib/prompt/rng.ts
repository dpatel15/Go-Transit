/**
 * Tiny deterministic PRNG utilities (no dependencies).
 *
 * Given the same seed, the engine produces the same staging — which makes the
 * output reproducible (great for tests and a "regenerate this exact look"
 * feature) while different seeds yield genuinely different, coherent scenes.
 */

/** Hash a string into a 32-bit seed generator (xmur3). */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32 PRNG — returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a well-distributed RNG from a numeric seed. */
export function seededRng(seed: number): () => number {
  const mix = xmur3(String(seed));
  return mulberry32(mix());
}

/** Normalise an optional user seed into a stable non-negative 31-bit integer. */
export function normalizeSeed(seed?: string | number): number {
  if (seed === undefined || seed === null || seed === "") {
    return Math.floor(Math.random() * 2 ** 31);
  }
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return Math.floor(Math.abs(seed)) % 2 ** 31;
  }
  return xmur3(String(seed))() % 2 ** 31;
}

/** Pick one element deterministically. Throws on empty input. */
export function pick<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick() called on an empty array");
  const idx = Math.floor(rng() * items.length) % items.length;
  const value = items[idx];
  if (value === undefined) throw new Error("pick() produced an out-of-range index");
  return value;
}

/** Sample up to `count` distinct elements deterministically (order varies). */
export function sampleSome<T>(rng: () => number, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const n = Math.max(0, Math.min(count, pool.length));
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    const [value] = pool.splice(idx, 1);
    if (value !== undefined) out.push(value);
  }
  return out;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
