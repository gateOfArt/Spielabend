import "server-only";

import { FixedWindowRateLimiter, type RateLimitRule } from "@/server/rate-limit/rate-limiter";

/**
 * PROJECT_DECISION thresholds: generous enough for legitimate interactive
 * use (including rapid manual testing) while bounding scripted brute-force
 * or flooding. Each limiter is a single-process in-memory instance; see
 * rate-limiter.ts for the documented multi-instance limitation.
 */
export const LOGIN_RATE_LIMIT: RateLimitRule = {
  limit: 5,
  windowMs: 5 * 60 * 1_000,
};

export const REGISTRATION_RATE_LIMIT: RateLimitRule = {
  limit: 5,
  windowMs: 10 * 60 * 1_000,
};

export const GAME_ACTION_RATE_LIMIT: RateLimitRule = {
  limit: 30,
  windowMs: 60 * 1_000,
};

export const loginRateLimiter = new FixedWindowRateLimiter({
  rule: LOGIN_RATE_LIMIT,
  now: () => Date.now(),
});

export const registrationRateLimiter = new FixedWindowRateLimiter({
  rule: REGISTRATION_RATE_LIMIT,
  now: () => Date.now(),
});

/**
 * Shared across Dice and Roulette, and across the Server Action and REST
 * dispatch entry points, so the limit tracks one "authenticated game
 * actions" budget per account regardless of which surface is used.
 */
export const gameActionRateLimiter = new FixedWindowRateLimiter({
  rule: GAME_ACTION_RATE_LIMIT,
  now: () => Date.now(),
});
