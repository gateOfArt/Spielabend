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
  ROULETTE_RULE,
  type RouletteRoundErrorCode,
  type RouletteRoundResult,
  type RouletteRoundService,
} from "@/server/services/roulette-round.contract";
import { DefaultRouletteRoundService } from "@/server/services/roulette-round";
import { RuntimeUnitOfWork } from "@/server/services/runtime-unit-of-work";
import {
  InMemoryStore,
  type RouletteRoundCommitResult,
  type RouletteRoundWrite,
} from "@/server/store/in-memory-store";

const VALID_SESSION_TOKEN = "valid-session-token";
const VALID_REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const STARTING_BALANCE = 100;

interface RouletteStateProbe {
  readonly credits: number;
  readonly rounds: readonly GameRound[];
  readonly transactions: readonly CreditTransaction[];
}

interface RouletteTestSubject {
  readonly service: RouletteRoundService;
  failNextAtomicWrite(): void;
  inspectState(): RouletteStateProbe;
  randomSpinCount(): number;
}

class RouletteTestStore extends InMemoryStore {
  private shouldFailRouletteCommit = false;

  failNextRouletteCommit() {
    this.shouldFailRouletteCommit = true;
  }

  override commitRouletteRound(
    write: RouletteRoundWrite,
  ): RouletteRoundCommitResult {
    if (this.shouldFailRouletteCommit) {
      this.shouldFailRouletteCommit = false;
      throw new Error("Injected atomic Roulette write failure");
    }

    return super.commitRouletteRound(write);
  }
}

function createSubject({
  credits = STARTING_BALANCE,
  forcedResult = 1,
}: {
  readonly credits?: number;
  readonly forcedResult?: number;
} = {}): RouletteTestSubject {
  const store = new RouletteTestStore();
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
    generateId: () => `roulette-test-id-${(nextId += 1)}`,
    now: () => new Date("2026-08-16T10:00:00.000Z"),
  });
  const account = unitOfWork.createAccountWithStartingCredit({
    displayName: "Ada Spielerin",
    normalizedEmail: "ada@example.com",
    passwordHash: "$test$password-hash",
  });
  let spins = 0;
  const service = new DefaultRouletteRoundService({
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
      spin() {
        spins += 1;
        return forcedResult;
      },
    },
  });

  return {
    service,
    failNextAtomicWrite() {
      store.failNextRouletteCommit();
    },
    inspectState() {
      const currentAccount = accountRepository.findById(account.id);

      if (!currentAccount) {
        throw new Error("Roulette test account disappeared");
      }

      return {
        credits: currentAccount.credits,
        rounds: store.listGameRounds(),
        transactions: transactionRepository
          .listAll()
          .filter((transaction) => transaction.reason === "ROULETTE_ROUND"),
      };
    },
    randomSpinCount() {
      return spins;
    },
  };
}

function validInput(
  overrides: Partial<{
    requestId: string;
    bet: number;
    selection: "RED" | "BLACK";
  }> = {},
) {
  return {
    requestId: overrides.requestId ?? VALID_REQUEST_ID,
    bet: overrides.bet ?? 10,
    selection: overrides.selection ?? "RED",
  };
}

function expectSuccess(
  result: RouletteRoundResult,
): asserts result is Extract<RouletteRoundResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

function expectFailure(
  result: RouletteRoundResult,
  code: RouletteRoundErrorCode,
): asserts result is Extract<RouletteRoundResult, { ok: false }> {
  expect(result).toEqual({ ok: false, code });
}

function expectUnchanged(
  subject: RouletteTestSubject,
  credits = STARTING_BALANCE,
) {
  expect(subject.inspectState()).toEqual({
    credits,
    rounds: [],
    transactions: [],
  });
}

describe("Roulette settlement and security contract", () => {
  it("settles the minimum valid bet", async () => {
    const subject = createSubject({ forcedResult: 2 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ bet: ROULETTE_RULE.minimumBet, selection: "BLACK" }),
    );

    expectSuccess(result);
    expect(result.round).toMatchObject({
      bet: ROULETTE_RULE.minimumBet,
      selection: "BLACK",
      result: 2,
      color: "BLACK",
      outcome: "win",
      netDelta: ROULETTE_RULE.minimumBet,
      finalCredits: STARTING_BALANCE + ROULETTE_RULE.minimumBet,
    });
  });

  it("settles the maximum valid bet", async () => {
    const subject = createSubject({ forcedResult: 1 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ bet: ROULETTE_RULE.maximumBet, selection: "RED" }),
    );

    expectSuccess(result);
    expect(result.round).toMatchObject({
      bet: ROULETTE_RULE.maximumBet,
      selection: "RED",
      result: 1,
      color: "RED",
      outcome: "win",
      netDelta: ROULETTE_RULE.maximumBet,
      finalCredits: STARTING_BALANCE + ROULETTE_RULE.maximumBet,
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

  it("rejects an invalid selection without mutation", async () => {
    const subject = createSubject();
    const untrustedInput: unknown = {
      ...validInput(),
      selection: "GREEN",
    };

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      untrustedInput,
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
    expect(subject.randomSpinCount()).toBe(0);
  });

  it.each([
    {
      caseName: "Red win",
      selection: "RED" as const,
      forcedResult: 1,
      expected: {
        result: 1,
        color: "RED",
        outcome: "win",
        netDelta: 10,
        finalCredits: 110,
      },
    },
    {
      caseName: "Red loss",
      selection: "RED" as const,
      forcedResult: 2,
      expected: {
        result: 2,
        color: "BLACK",
        outcome: "loss",
        netDelta: -10,
        finalCredits: 90,
      },
    },
    {
      caseName: "Black win",
      selection: "BLACK" as const,
      forcedResult: 2,
      expected: {
        result: 2,
        color: "BLACK",
        outcome: "win",
        netDelta: 10,
        finalCredits: 110,
      },
    },
    {
      caseName: "Black loss",
      selection: "BLACK" as const,
      forcedResult: 1,
      expected: {
        result: 1,
        color: "RED",
        outcome: "loss",
        netDelta: -10,
        finalCredits: 90,
      },
    },
  ])("settles a forced $caseName with the exact net delta", async (testCase) => {
    const subject = createSubject({ forcedResult: testCase.forcedResult });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ bet: 10, selection: testCase.selection }),
    );

    expectSuccess(result);
    expect(result.round).toMatchObject({
      requestId: VALID_REQUEST_ID,
      bet: 10,
      selection: testCase.selection,
      ...testCase.expected,
    });
    expect(subject.inspectState().credits).toBe(testCase.expected.finalCredits);
  });

  it.each([{ selection: "RED" as const }, { selection: "BLACK" as const }])(
    "loses a zero result for a $selection bet",
    async ({ selection }) => {
      const subject = createSubject({ forcedResult: 0 });

      const result = await subject.service.play(
        VALID_SESSION_TOKEN,
        validInput({ bet: 10, selection }),
      );

      expectSuccess(result);
      expect(result.round).toMatchObject({
        selection,
        result: 0,
        color: "GREEN",
        outcome: "loss",
        netDelta: -10,
        finalCredits: 90,
      });
    },
  );

  it("creates exactly one related round and one net transaction", async () => {
    const subject = createSubject({ forcedResult: 1 });

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
      delta: 10,
      reason: ROULETTE_RULE.transactionReason,
      resultingBalance: 110,
    });
    expect(round.finalCredits).toBe(state.credits);
    expect(transaction.resultingBalance).toBe(state.credits);
  });

  it("returns only the safe Roulette DTO", async () => {
    const subject = createSubject({ forcedResult: 1 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput(),
    );

    expectSuccess(result);
    expect(Object.keys(result.round).sort()).toEqual([
      "bet",
      "color",
      "finalCredits",
      "netDelta",
      "outcome",
      "requestId",
      "result",
      "selection",
    ]);
    expect(JSON.stringify(result)).not.toContain("accountId");
    expect(JSON.stringify(result)).not.toContain(VALID_SESSION_TOKEN);
    expect(JSON.stringify(result)).not.toContain("transactionId");
  });

  it("does not reserve an idempotency key for a rejected request", async () => {
    const subject = createSubject();

    const rejected = await subject.service.play(VALID_SESSION_TOKEN, {
      ...validInput({ requestId: SECOND_REQUEST_ID }),
      selection: "GREEN",
    });

    expectFailure(rejected, "INVALID_INPUT");
    expectUnchanged(subject);

    const corrected = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ requestId: SECOND_REQUEST_ID, selection: "RED" }),
    );
    expectSuccess(corrected);
    expect(corrected.round.requestId).toBe(SECOND_REQUEST_ID);
  });

  it("replays an identical request without a second mutation or spin", async () => {
    const subject = createSubject({ forcedResult: 1 });

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
    expect(subject.randomSpinCount()).toBe(1);
  });

  it("rejects a conflicting request ID without a second mutation", async () => {
    const subject = createSubject({ forcedResult: 1 });

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
    expect(subject.randomSpinCount()).toBe(1);
  });

  it("keeps all settlement state unchanged after an atomic write failure", async () => {
    const subject = createSubject({ forcedResult: 1 });
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
    expect(subject.randomSpinCount()).toBe(0);
  });

  it("rejects client-selected authority and settlement fields", async () => {
    const subject = createSubject({ forcedResult: 1 });
    const untrustedInput: unknown = {
      ...validInput(),
      accountId: "client-selected-account",
      result: 1,
      color: "RED",
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
    const subject = createSubject({ forcedResult: 37 });

    const result = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput(),
    );

    expectFailure(result, "ROUND_FAILED");
    expectUnchanged(subject);
  });
});
