/**
 * In-memory sliding-window rate limiter.
 *
 * Good enough for a single instance and for local/dev. For multi-instance
 * production, back it with Redis/Upstash — the interface stays the same.
 * `now` is injectable so the behaviour is deterministic under test.
 */

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly max: number;
  private readonly now: () => number;

  constructor(opts: RateLimiterOptions) {
    this.windowMs = opts.windowMs;
    this.max = opts.max;
    this.now = opts.now ?? Date.now;
  }

  check(key: string): RateLimitResult {
    const now = this.now();
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= this.max) {
      const oldest = recent[0] ?? now;
      this.hits.set(key, recent);
      return { allowed: false, remaining: 0, resetMs: Math.max(0, oldest + this.windowMs - now) };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, remaining: this.max - recent.length, resetMs: this.windowMs };
  }

  reset(key?: string): void {
    if (key === undefined) this.hits.clear();
    else this.hits.delete(key);
  }

  /** Drop stale keys to bound memory (call periodically if long-lived). */
  sweep(): void {
    const cutoff = this.now() - this.windowMs;
    for (const [key, times] of this.hits) {
      const live = times.filter((t) => t > cutoff);
      if (live.length === 0) this.hits.delete(key);
      else this.hits.set(key, live);
    }
  }
}
