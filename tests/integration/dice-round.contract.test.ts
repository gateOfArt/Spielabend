import { describe, expect, it } from "vitest";
import type { CreditTransaction } from "@/domain/account";
import {
  creditPolicy,
  type CreditPolicy,
} from "@/domain/credits";
import type { GameRound } from "@/domain/game-round";
import { AccountRepository } from "@/server/repositories/account-repository";
import { CreditTransactionRepository } from "@/server/repositories/credit-transaction-repository";
import {
  DICE_RULE,
  type DiceRoundErrorCode,
  type DiceRoundResult,
  type DiceRoundService,
} from "@/server/services/dice-round.contract";
import { DefaultDiceRoundService } from "@/server/services/dice-round";
import { RuntimeUnitOfWork } from "@/server/services/runtime-unit-of-work";
import {
  InMemoryStore,
  type DiceRoundCommitResult,
  type DiceRoundWrite,
} from "@/server/store/in-memory-store";

const VALID_SESSION_TOKEN = "valid-session-token";
const VALID_REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const STARTING_BALANCE = 100;

interface DiceStateProbe {
  readonly credits: number;
  readonly rounds: readonly GameRound[];
  readonly transactions: readonly CreditTransaction[];
}

interface DiceTestSubject {
  readonly service: DiceRoundService;
  failNextAtomicWrite(): void;
  inspectState(): DiceStateProbe;
  randomRollCount(): number;
}

class DiceTestStore extends InMemoryStore {
  private shouldFailDiceCommit = false;

  failNextDiceCommit() {
    this.shouldFailDiceCommit = true;
  }

  override commitDiceRound(write: DiceRoundWrite): DiceRoundCommitResult {
    if (this.shouldFailDiceCommit) {
      this.shouldFailDiceCommit = false;
      throw new Error("Injected atomic Dice write failure");
    }

    return super.commitDiceRound(write);
  }
}

function createSubject({
  credits = STARTING_BALANCE,
  forcedResult = 1,
}: {
  readonly credits?: number;
  readonly forcedResult?: number;
} = {}): DiceTestSubject {
  const store = new DiceTestStore();
  const accountRepository = new AccountRepository(store);
  const transactionRepository = new CreditTransactionRepository(store);
  const initialCreditPolicy: CreditPolicy = {
    ...creditPolicy,
    startingDelta: credits,
  };
  let nextId = 0;
  const unitOfWork = new RuntimeUnitOfWork({
    store,
    creditPolicy: initialCreditPolicy,
    generateId: () => `dice-test-id-${(nextId += 1)}`,
    now: () => new Date("2026-08-15T10:00:00.000Z"),
  });
  const account = unitOfWork.createAccountWithStartingCredit({
    displayName: "Ada Spielerin",
    normalizedEmail: "ada@example.com",
    passwordHash: "$test$password-hash",
  });
  let randomRolls = 0;
  const service = new DefaultDiceRoundService({
    authenticationService: {
      requireAuthenticatedAccount(sessionToken) {
        return Promise.resolve(
          sessionToken === VALID_SESSION_TOKEN
            ? {
                ok: true as const,
                principal: {
                  accountId: account.id,
                  sessionId: "session-1",
                },
              }
            : {
                ok: false as const,
                code: "AUTHENTICATION_REQUIRED" as const,
              },
        );
      },
    },
    accountRepository,
    creditService: creditPolicy,
    unitOfWork,
    randomSource: {
      rollDie() {
        randomRolls += 1;
        return forcedResult;
      },
    },
  });

  return {
    service,
    failNextAtomicWrite() {
      store.failNextDiceCommit();
    },
    inspectState() {
      const currentAccount = accountRepository.findById(account.id);

      if (!currentAccount) {
        throw new Error("Dice test account disappeared");
      }

      return {
        credits: currentAccount.credits,
        rounds: store.listGameRounds(),
        transactions: transactionRepository
          .listAll()
          .filter((transaction) => transaction.reason === "DICE_ROUND"),
      };
    },
    randomRollCount() {
      return randomRolls;
    },
  };
}

function validInput(
  overrides: Partial<{
    requestId: string;
    bet: number;
    prediction: number;
  }> = {},
) {
  return {
    requestId: overrides.requestId ?? VALID_REQUEST_ID,
    bet: overrides.bet ?? 10,
    prediction: overrides.prediction ?? 4,
  };
}

function expectSuccess(
  result: DiceRoundResult,
): asserts result is Extract<DiceRoundResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

function expectFailure(
  result: DiceRoundResult,
  code: DiceRoundErrorCode,
): asserts result is Extract<DiceRoundResult, { ok: false }> {
  expect(result).toEqual({ ok: false, code });
}

function expectUnchanged(subject: DiceTestSubject, credits = STARTING_BALANCE) {
  expect(subject.inspectState()).toEqual({
    credits,
    rounds: [],
    transactions: [],
  });
}

describe("Dice settlement and security contract", () => {
  it("settles the minimum valid bet", async () => {
    const subject = createSubject({ forcedResult: 1 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ bet: DICE_RULE.minimumBet, prediction: 6 }),
    );

    expectSuccess(result);
    expect(result.round).toMatchObject({
      bet: DICE_RULE.minimumBet,
      result: 1,
      outcome: "loss",
      netDelta: -1,
      finalCredits: 99,
    });
  });

  it("settles the maximum valid bet", async () => {
    const subject = createSubject({ forcedResult: 6 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ bet: DICE_RULE.maximumBet, prediction: 6 }),
    );

    expectSuccess(result);
    expect(result.round).toMatchObject({
      bet: DICE_RULE.maximumBet,
      result: 6,
      outcome: "win",
      netDelta: 500,
      finalCredits: 600,
    });
  });

  it.each([
    { caseName: "zero", bet: 0 },
    { caseName: "negative", bet: -1 },
    { caseName: "non-integer", bet: 1.5 },
    { caseName: "above the rule maximum", bet: 101 },
  ])("rejects a $caseName bet without mutation", async ({ bet }) => {
    const subject = createSubject();

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ bet }),
    );

    expectFailure(result, "INVALID_INPUT");
    expectUnchanged(subject);
  });

  it("rejects a valid-range bet above the current balance", async () => {
    const subject = createSubject({ credits: 10 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ bet: 11 }),
    );

    expectFailure(result, "INSUFFICIENT_CREDITS");
    expectUnchanged(subject, 10);
    expect(subject.randomRollCount()).toBe(0);
  });

  it.each([
    {
      caseName: "win",
      forcedResult: 4,
      expected: {
        result: 4,
        outcome: "win",
        netDelta: 50,
        finalCredits: 150,
      },
    },
    {
      caseName: "loss",
      forcedResult: 2,
      expected: {
        result: 2,
        outcome: "loss",
        netDelta: -10,
        finalCredits: 90,
      },
    },
  ])("settles a forced $caseName with the exact net delta", async (testCase) => {
    const subject = createSubject({ forcedResult: testCase.forcedResult });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ bet: 10, prediction: 4 }),
    );

    expectSuccess(result);
    expect(result.round).toMatchObject({
      requestId: VALID_REQUEST_ID,
      bet: 10,
      prediction: 4,
      ...testCase.expected,
    });
    expect(subject.inspectState().credits).toBe(testCase.expected.finalCredits);
  });

  it("creates exactly one related round and one net transaction", async () => {
    const subject = createSubject({ forcedResult: 4 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput(),
    );

    expectSuccess(result);
    const state = subject.inspectState();
    expect(state.rounds).toHaveLength(1);
    expect(state.transactions).toHaveLength(1);
    const [round] = state.rounds;
    const [transaction] = state.transactions;
    expect(round.transactionId).toBe(transaction.id);
    expect(transaction.roundId).toBe(round.id);
    expect(transaction).toMatchObject({
      accountId: round.accountId,
      delta: 50,
      reason: DICE_RULE.transactionReason,
      resultingBalance: 150,
    });
    expect(round.finalCredits).toBe(state.credits);
    expect(transaction.resultingBalance).toBe(state.credits);
  });

  it("returns only the safe Dice DTO", async () => {
    const subject = createSubject({ forcedResult: 4 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput(),
    );

    expectSuccess(result);
    expect(Object.keys(result.round).sort()).toEqual([
      "bet",
      "finalCredits",
      "netDelta",
      "outcome",
      "prediction",
      "requestId",
      "result",
    ]);
    expect(JSON.stringify(result)).not.toContain("accountId");
    expect(JSON.stringify(result)).not.toContain(VALID_SESSION_TOKEN);
    expect(JSON.stringify(result)).not.toContain("transactionId");
  });

  it("does not reserve an idempotency key for a rejected request", async () => {
    const subject = createSubject();

    const rejected = await subject.service.play(VALID_SESSION_TOKEN, {
      ...validInput({ requestId: SECOND_REQUEST_ID }),
      prediction: 7,
    });

    expectFailure(rejected, "INVALID_INPUT");
    expectUnchanged(subject);

    const corrected = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ requestId: SECOND_REQUEST_ID, prediction: 4 }),
    );
    expectSuccess(corrected);
    expect(corrected.round.requestId).toBe(SECOND_REQUEST_ID);
  });

  it("replays an identical request without a second mutation or roll", async () => {
    const subject = createSubject({ forcedResult: 4 });

    const first = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput(),
    );
    const replay = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput(),
    );

    expectSuccess(first);
    expectSuccess(replay);
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.round).toEqual(first.round);
    expect(subject.inspectState().rounds).toHaveLength(1);
    expect(subject.inspectState().transactions).toHaveLength(1);
    expect(subject.randomRollCount()).toBe(1);
  });

  it("rejects a conflicting request ID without a second mutation", async () => {
    const subject = createSubject({ forcedResult: 4 });

    const first = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput(),
    );
    const conflict = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ bet: 11 }),
    );

    expectSuccess(first);
    expectFailure(conflict, "REQUEST_CONFLICT");
    expect(subject.inspectState().rounds).toHaveLength(1);
    expect(subject.inspectState().transactions).toHaveLength(1);
    expect(subject.randomRollCount()).toBe(1);
  });

  it("keeps all settlement state unchanged after an atomic write failure", async () => {
    const subject = createSubject({ forcedResult: 4 });
    subject.failNextAtomicWrite();

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput(),
    );

    expectFailure(result, "ROUND_FAILED");
    expectUnchanged(subject);
  });

  it("rejects an unauthorized caller without mutation", async () => {
    const subject = createSubject();

    const result = await subject.service.play(null, validInput());

    expectFailure(result, "AUTHENTICATION_REQUIRED");
    expectUnchanged(subject);
    expect(subject.randomRollCount()).toBe(0);
  });

  it("rejects client-selected authority and settlement fields", async () => {
    const subject = createSubject({ forcedResult: 4 });
    const untrustedInput: unknown = {
      ...validInput(),
      userId: "client-selected-user",
      result: 4,
      payout: 1_000_000,
      netDelta: 1_000_000,
      finalCredits: 1_000_100,
    };

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      untrustedInput,
    );

    expectFailure(result, "INVALID_INPUT");
    expectUnchanged(subject);
  });

  it("rejects an out-of-range RandomSource result without mutation", async () => {
    const subject = createSubject({ forcedResult: 7 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput(),
    );

    expectFailure(result, "ROUND_FAILED");
    expectUnchanged(subject);
  });
});
