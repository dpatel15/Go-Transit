import { describe, it, expect } from "vitest";
import { RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  it("allows up to max requests then blocks within the window", () => {
    let t = 1000;
    const rl = new RateLimiter({ windowMs: 1000, max: 3, now: () => t });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(true);
    const third = rl.check("a");
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    const blocked = rl.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it("allows again after the window slides", () => {
    let t = 0;
    const rl = new RateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
    t += 1001;
    expect(rl.check("a").allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    let t = 0;
    const rl = new RateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });

  it("reset clears a key", () => {
    let t = 0;
    const rl = new RateLimiter({ windowMs: 1000, max: 1, now: () => t });
    rl.check("a");
    rl.reset("a");
    expect(rl.check("a").allowed).toBe(true);
  });

  it("sweep drops stale keys", () => {
    let t = 0;
    const rl = new RateLimiter({ windowMs: 1000, max: 5, now: () => t });
    rl.check("a");
    t += 5000;
    rl.sweep();
    // After sweeping, the key is fresh again.
    expect(rl.check("a").remaining).toBe(4);
  });
});
