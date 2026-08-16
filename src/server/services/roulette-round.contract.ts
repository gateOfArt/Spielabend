import "server-only";

import { ROULETTE_ROUND_CREDIT_REASON } from "@/domain/credits";
import type { RouletteColor, RouletteRoundResult } from "@/domain/roulette";

export type {
  RouletteColor,
  RouletteOutcome,
  RouletteRoundDto,
  RouletteRoundErrorCode,
  RouletteRoundResult,
  RouletteSelection,
} from "@/domain/roulette";

export const ROULETTE_RULE = Object.freeze({
  minimumBet: 1,
  maximumBet: 100,
  minimumResult: 0,
  maximumResult: 36,
  winNetMultiplier: 1,
  transactionReason: ROULETTE_ROUND_CREDIT_REASON,
  redNumbers: Object.freeze([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ]),
  blackNumbers: Object.freeze([
    2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
  ]),
} as const);

/**
 * Single central source for the European red/black color mapping. `0` is
 * `GREEN` and belongs to neither wagerable color.
 */
export function resolveRouletteColor(result: number): RouletteColor {
  if ((ROULETTE_RULE.redNumbers as readonly number[]).includes(result)) {
    return "RED";
  }

  if ((ROULETTE_RULE.blackNumbers as readonly number[]).includes(result)) {
    return "BLACK";
  }

  return "GREEN";
}

export interface RouletteRandomSource {
  spin(): number;
}

/**
 * Server-only Roulette service boundary. Identity and settlement values are
 * always derived and verified on the server.
 */
export interface RouletteRoundService {
  play(sessionToken: unknown, input: unknown): Promise<RouletteRoundResult>;
}
