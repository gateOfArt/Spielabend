import "server-only";

export const DICE_RULE = Object.freeze({
  minimumBet: 1,
  maximumBet: 100,
  minimumFace: 1,
  maximumFace: 6,
  winNetMultiplier: 5,
  transactionReason: "DICE_ROUND",
} as const);

export type DiceOutcome = "win" | "loss";

export type DiceRoundErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_INPUT"
  | "INSUFFICIENT_CREDITS"
  | "REQUEST_CONFLICT"
  | "ROUND_FAILED";

export interface DiceRoundDto {
  readonly requestId: string;
  readonly bet: number;
  readonly prediction: number;
  readonly result: number;
  readonly outcome: DiceOutcome;
  readonly netDelta: number;
  readonly finalCredits: number;
}

export type DiceRoundResult =
  | {
      readonly ok: true;
      readonly replayed: boolean;
      readonly round: DiceRoundDto;
    }
  | {
      readonly ok: false;
      readonly code: DiceRoundErrorCode;
    };

export interface RandomSource {
  rollDie(): number;
}

/**
 * Contract-only seam for Dice RED tests. Production behavior follows only
 * after the exact rule has received explicit human approval.
 */
export interface DiceRoundService {
  play(sessionToken: unknown, input: unknown): Promise<DiceRoundResult>;
}
