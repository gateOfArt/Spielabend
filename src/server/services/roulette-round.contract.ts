import "server-only";

export const ROULETTE_RULE = Object.freeze({
  minimumBet: 1,
  maximumBet: 100,
  minimumResult: 0,
  maximumResult: 36,
  winNetMultiplier: 1,
  transactionReason: "ROULETTE_ROUND",
  redNumbers: Object.freeze([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ]),
  blackNumbers: Object.freeze([
    2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
  ]),
} as const);

export type RouletteSelection = "RED" | "BLACK";

export type RouletteColor = "RED" | "BLACK" | "GREEN";

export type RouletteOutcome = "win" | "loss";

export type RouletteRoundErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_INPUT"
  | "INSUFFICIENT_CREDITS"
  | "REQUEST_CONFLICT"
  | "ROUND_FAILED";

export interface RouletteRoundDto {
  readonly requestId: string;
  readonly bet: number;
  readonly selection: RouletteSelection;
  readonly result: number;
  readonly color: RouletteColor;
  readonly outcome: RouletteOutcome;
  readonly netDelta: number;
  readonly finalCredits: number;
}

export type RouletteRoundResult =
  | {
      readonly ok: true;
      readonly replayed: boolean;
      readonly round: RouletteRoundDto;
    }
  | {
      readonly ok: false;
      readonly code: RouletteRoundErrorCode;
    };

export interface RouletteRandomSource {
  spin(): number;
}

/**
 * Contract-only seam for Roulette RED tests. Production behavior follows
 * only after the exact rule has received explicit human approval.
 */
export interface RouletteRoundService {
  play(sessionToken: unknown, input: unknown): Promise<RouletteRoundResult>;
}
