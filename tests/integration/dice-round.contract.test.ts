import { describe, expect, it } from "vitest";
import {
  DICE_RULE,
  type DiceRoundErrorCode,
  type DiceRoundResult,
  type DiceRoundService,
  type RandomSource,
} from "@/server/services/dice-round.contract";

const ACCOUNT_ID = "account-1";
const VALID_SESSION_TOKEN = "valid-session-token";
const VALID_REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const STARTING_BALANCE = 100;

interface AccountProbe {
  readonly id: string;
  readonly credits: number;
}

interface DiceRoundProbe {
  readonly id: string;
  readonly accountId: string;
  readonly transactionId: string;
  readonly requestId: string;
  readonly bet: number;
  readonly prediction: number;
  readonly result: number;
  readonly outcome: "win" | "loss";
  readonly netDelta: number;
  readonly finalCredits: number;
}

interface DiceTransactionProbe {
  readonly id: string;
  readonly accountId: string;
  readonly roundId: string;
  readonly delta: number;
  readonly reason: typeof DICE_RULE.transactionReason;
  readonly resultingBalance: number;
}

interface DiceStateProbe {
  readonly account: AccountProbe;
  readonly rounds: readonly DiceRoundProbe[];
  readonly transactions: readonly DiceTransactionProbe[];
}

interface DiceTestSubject {
  readonly service: DiceRoundService;
  failNextAtomicWrite(): void;
  inspectState(): DiceStateProbe;
}

class NotImplementedDiceRoundService implements DiceRoundService {
  constructor(private readonly randomSource: RandomSource) {
    void this.randomSource;
  }

  play(sessionToken: unknown, input: unknown): Promise<DiceRoundResult> {
    void sessionToken;
    void input;

    return Promise.resolve({
      ok: true,
      replayed: false,
      round: {
        requestId: "00000000-0000-4000-8000-000000000000",
        bet: 0,
        prediction: 1,
        result: 1,
        outcome: "win",
        netDelta: 0,
        finalCredits: 0,
      },
    });
  }
}

function createSubject({
  credits = STARTING_BALANCE,
  forcedResult = 1,
}: {
  readonly credits?: number;
  readonly forcedResult?: number;
} = {}): DiceTestSubject {
  const state: DiceStateProbe = {
    account: { id: ACCOUNT_ID, credits },
    rounds: [],
    transactions: [],
  };
  const randomSource: RandomSource = {
    rollDie: () => forcedResult,
  };

  return {
    service: new NotImplementedDiceRoundService(randomSource),
    failNextAtomicWrite() {},
    inspectState() {
      return {
        account: { ...state.account },
        rounds: state.rounds.map((round) => ({ ...round })),
        transactions: state.transactions.map((transaction) => ({
          ...transaction,
        })),
      };
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
    account: { id: ACCOUNT_ID, credits },
    rounds: [],
    transactions: [],
  });
}

describe("Dice settlement and security contract (RED)", () => {
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
    expect(round.accountId).toBe(ACCOUNT_ID);
    expect(transaction).toMatchObject({
      accountId: ACCOUNT_ID,
      delta: 50,
      reason: DICE_RULE.transactionReason,
      resultingBalance: 150,
    });
    expect(round.finalCredits).toBe(state.account.credits);
    expect(transaction.resultingBalance).toBe(state.account.credits);
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
    expect(JSON.stringify(result)).not.toContain(ACCOUNT_ID);
    expect(JSON.stringify(result)).not.toContain(VALID_SESSION_TOKEN);
    expect(JSON.stringify(result)).not.toContain("transactionId");
  });

  it("does not reserve an idempotency key for a rejected request", async () => {
    const subject = createSubject();

    const rejected = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ requestId: SECOND_REQUEST_ID, prediction: 7 }),
    );

    expectFailure(rejected, "INVALID_INPUT");
    expectUnchanged(subject);

    const corrected = await subject.service.play(
      VALID_SESSION_TOKEN,
      validInput({ requestId: SECOND_REQUEST_ID, prediction: 4 }),
    );
    expectSuccess(corrected);
    expect(corrected.round.requestId).toBe(SECOND_REQUEST_ID);
  });

  it("replays an identical request without a second mutation", async () => {
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
  });

  it("rejects a conflicting reuse of a request ID without a second mutation", async () => {
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
  });

  it("keeps balance, ledger, and rounds unchanged after an atomic write failure", async () => {
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
