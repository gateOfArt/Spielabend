import "server-only";

import { DICE_ROUND_CREDIT_REASON } from "@/domain/credits";
import type { DiceRoundResult } from "@/domain/dice";

export type {
  DiceOutcome,
  DiceRoundDto,
  DiceRoundErrorCode,
  DiceRoundResult,
} from "@/domain/dice";

export const DICE_RULE = Object.freeze({
  minimumBet: 1,
  maximumBet: 100,
  minimumFace: 1,
  maximumFace: 6,
  winNetMultiplier: 5,
  transactionReason: DICE_ROUND_CREDIT_REASON,
} as const);

export interface RandomSource {
  rollDie(): number;
}

/**
 * Server-only Dice service boundary. Identity and settlement values are
 * always derived and verified on the server.
 */
export interface DiceRoundService {
  play(sessionToken: unknown, input: unknown): Promise<DiceRoundResult>;
}
