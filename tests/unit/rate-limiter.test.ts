import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "@/server/rate-limit/rate-limiter";

function createClock(startMs = 0) {
  let currentMs = startMs;

  return {
    now: () => currentMs,
    advance(ms: number) {
      currentMs += ms;
    },
  };
}

describe("FixedWindowRateLimiter", () => {
  it("allows up to the configured limit within one window", () => {
    const clock = createClock();
    const limiter = new FixedWindowRateLimiter({
      rule: { limit: 3, windowMs: 1_000 },
      now: clock.now,
    });

    expect(limiter.consume("key").allowed).toBe(true);
    expect(limiter.consume("key").allowed).toBe(true);
    expect(limiter.consume("key").allowed).toBe(true);
  });

  it("blocks once the limit is exceeded and reports a positive Retry-After", () => {
    const clock = createClock();
    const limiter = new FixedWindowRateLimiter({
      rule: { limit: 2, windowMs: 1_000 },
      now: clock.now,
    });

    limiter.consume("key");
    limiter.consume("key");
    const blocked = limiter.consume("key");

    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it("resets the window deterministically once it elapses", () => {
    const clock = createClock();
    const limiter = new FixedWindowRateLimiter({
      rule: { limit: 1, windowMs: 1_000 },
      now: clock.now,
    });

    expect(limiter.consume("key").allowed).toBe(true);
    expect(limiter.consume("key").allowed).toBe(false);

    clock.advance(999);
    expect(limiter.consume("key").allowed).toBe(false);

    clock.advance(1);
    expect(limiter.consume("key").allowed).toBe(true);
  });

  it("isolates independent keys from each other", () => {
    const clock = createClock();
    const limiter = new FixedWindowRateLimiter({
      rule: { limit: 1, windowMs: 1_000 },
      now: clock.now,
    });

    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("b").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
    expect(limiter.consume("b").allowed).toBe(false);
  });

  it("bounds memory by evicting the oldest tracked key once the cap is exceeded", () => {
    const clock = createClock();
    const limiter = new FixedWindowRateLimiter({
      rule: { limit: 1, windowMs: 1_000 },
      now: clock.now,
      maxTrackedKeys: 2,
    });

    limiter.consume("a");
    limiter.consume("b");
    expect(limiter.consume("a").allowed).toBe(false);

    // Tracking a third key exceeds the cap and evicts the oldest ("a"),
    // which forgets its history and allows it again as a fresh key.
    limiter.consume("c");
    expect(limiter.consume("a").allowed).toBe(true);
    // "c" was never evicted (only reads of already-blocked keys happened
    // since), so its own limit still holds.
    expect(limiter.consume("c").allowed).toBe(false);
  });
});
