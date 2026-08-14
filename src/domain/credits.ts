export const STARTING_CREDITS = 100;

export const STARTING_CREDIT_REASON = "STARTING_CREDIT" as const;

export type StartingCreditReason = typeof STARTING_CREDIT_REASON;

export interface CreditPolicy {
  readonly startingDelta: number;
  readonly startingReason: StartingCreditReason;
  calculateResultingBalance(currentBalance: number, delta: number): number | null;
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
