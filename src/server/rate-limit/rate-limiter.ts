import "server-only";

/**
 * Deliberately a single-process, in-memory fixed-window limiter. It does not
 * protect multiple server instances or worker processes; a production
 * multi-instance deployment needs a shared store (e.g. Redis) behind the
 * same key scheme instead.
 */
export interface RateLimitRule {
  readonly limit: number;
  readonly windowMs: number;
}

export type RateLimitResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

export interface RateLimiter {
  consume(key: string): RateLimitResult;
}

interface RateLimitWindow {
  count: number;
  windowStartedAt: number;
}

export interface FixedWindowRateLimiterProps {
  readonly rule: RateLimitRule;
  readonly now: () => number;
  /** Bounds the tracked-key map so an unbounded stream of unique keys cannot grow memory without limit. */
  readonly maxTrackedKeys?: number;
}

const DEFAULT_MAX_TRACKED_KEYS = 10_000;

export class FixedWindowRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, RateLimitWindow>();
  private readonly rule: RateLimitRule;
  private readonly now: () => number;
  private readonly maxTrackedKeys: number;

  constructor({ rule, now, maxTrackedKeys = DEFAULT_MAX_TRACKED_KEYS }: FixedWindowRateLimiterProps) {
    this.rule = rule;
    this.now = now;
    this.maxTrackedKeys = maxTrackedKeys;
  }

  consume(key: string): RateLimitResult {
    const nowMs = this.now();
    const existing = this.windows.get(key);

    if (!existing || nowMs - existing.windowStartedAt >= this.rule.windowMs) {
      this.trackWindow(key, { count: 1, windowStartedAt: nowMs });
      return { allowed: true };
    }

    if (existing.count < this.rule.limit) {
      existing.count += 1;
      return { allowed: true };
    }

    const retryAfterMs = existing.windowStartedAt + this.rule.windowMs - nowMs;

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  private trackWindow(key: string, window: RateLimitWindow): void {
    this.windows.delete(key);
    this.windows.set(key, window);

    if (this.windows.size > this.maxTrackedKeys) {
      const oldestKey = this.windows.keys().next().value;

      if (oldestKey !== undefined) {
        this.windows.delete(oldestKey);
      }
    }
  }
}
