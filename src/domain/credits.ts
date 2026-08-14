export const STARTING_CREDITS = 100;

export const STARTING_CREDIT_REASON = "STARTING_CREDIT" as const;
export const DICE_ROUND_CREDIT_REASON = "DICE_ROUND" as const;

export type StartingCreditReason = typeof STARTING_CREDIT_REASON;
export type CreditTransactionReason =
  | StartingCreditReason
  | typeof DICE_ROUND_CREDIT_REASON;

export interface CreditService {
  calculateResultingBalance(currentBalance: number, delta: number): number | null;
}

export interface CreditPolicy extends CreditService {
  readonly startingDelta: number;
  readonly startingReason: StartingCreditReason;
}

export const creditPolicy: CreditPolicy = Object.freeze({
  startingDelta: STARTING_CREDITS,
  startingReason: STARTING_CREDIT_REASON,
  calculateResultingBalance(currentBalance: number, delta: number) {
    if (!Number.isSafeInteger(currentBalance) || !Number.isSafeInteger(delta)) {
      return null;
    }

    const resultingBalance = currentBalance + delta;

    if (!Number.isSafeInteger(resultingBalance) || resultingBalance < 0) {
      return null;
    }

    return resultingBalance;
  },
});
