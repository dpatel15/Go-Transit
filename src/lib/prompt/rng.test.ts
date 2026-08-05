import { describe, it, expect } from "vitest";
import { seededRng, normalizeSeed, pick, sampleSome, clamp } from "./rng";

describe("seededRng", () => {
  it("is deterministic for the same seed", () => {
    const a = seededRng(123);
    const b = seededRng(123);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("differs across seeds", () => {
    const a = seededRng(1);
    const b = seededRng(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it("produces floats in [0, 1)", () => {
    const r = seededRng(7);
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("pick", () => {
  it("returns an element of the array", () => {
    const arr = ["a", "b", "c"] as const;
    expect(arr).toContain(pick(seededRng(1), arr));
  });

  it("is deterministic for the same seed", () => {
    const arr = ["a", "b", "c", "d", "e"] as const;
    expect(pick(seededRng(9), arr)).toBe(pick(seededRng(9), arr));
  });

  it("throws on an empty array", () => {
    expect(() => pick(seededRng(1), [])).toThrow();
  });
});

describe("sampleSome", () => {
  it("returns min(count, length) distinct elements", () => {
    const arr = ["a", "b", "c", "d"];
    const out = sampleSome(seededRng(3), arr, 2);
    expect(out).toHaveLength(2);
    expect(new Set(out).size).toBe(2);
    out.forEach((x) => expect(arr).toContain(x));
  });

  it("caps at the array length when count exceeds it", () => {
    const arr = ["a", "b"];
    expect(sampleSome(seededRng(3), arr, 5)).toHaveLength(2);
  });

  it("returns nothing for count <= 0", () => {
    expect(sampleSome(seededRng(3), ["a", "b"], 0)).toEqual([]);
  });
});

describe("normalizeSeed", () => {
  it("is stable for the same string", () => {
    expect(normalizeSeed("kankotri")).toBe(normalizeSeed("kankotri"));
  });

  it("passes finite numbers through (floored, non-negative)", () => {
    expect(normalizeSeed(42)).toBe(42);
    expect(normalizeSeed(-5)).toBe(5);
  });

  it("returns an in-range integer when unseeded", () => {
    const s = normalizeSeed();
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 31);
  });
});

describe("clamp", () => {
  it("bounds values", () => {
    expect(clamp(5, 1, 4)).toBe(4);
    expect(clamp(-1, 1, 4)).toBe(1);
    expect(clamp(3, 1, 4)).toBe(3);
  });
});
