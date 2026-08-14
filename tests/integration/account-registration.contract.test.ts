import { describe, expect, it } from "vitest";
import {
  STARTING_CREDITS,
  STARTING_CREDIT_REASON,
} from "@/domain/credits";
import type {
  AccountRegistrationResult,
  AccountRegistrationService,
  RegistrationErrorCode,
} from "@/server/services/account-registration.contract";

interface StoredAccountProbe {
  id: string;
  displayName: string;
  normalizedEmail: string;
  passwordHash: string;
  credits: number;
}

interface StoredCreditTransactionProbe {
  id: string;
  accountId: string;
  delta: number;
  reason: string;
  resultingBalance: number;
}

interface RegistrationStateProbe {
  accounts: readonly StoredAccountProbe[];
  transactions: readonly StoredCreditTransactionProbe[];
}

type AtomicFailurePoint = "account-write" | "ledger-write";

interface AccountRegistrationTestSubject {
  service: AccountRegistrationService;
  failNextWriteAt(point: AtomicFailurePoint): void;
  inspectState(): RegistrationStateProbe;
}

class NotImplementedAccountRegistrationService
  implements AccountRegistrationService
{
  register(input: unknown): Promise<AccountRegistrationResult> {
    void input;

    return Promise.resolve({
      ok: false,
      code: "REGISTRATION_FAILED",
    });
  }
}

function createSubject(): AccountRegistrationTestSubject {
  const emptyState: RegistrationStateProbe = {
    accounts: [],
    transactions: [],
  };

  return {
    service: new NotImplementedAccountRegistrationService(),
    failNextWriteAt(point) {
      void point;
    },
    inspectState() {
      return emptyState;
    },
  };
}

function validRegistrationInput() {
  return {
    displayName: "Ada Spielerin",
    email: "ada@example.com",
    password: "correct horse battery staple",
  };
}

function expectSuccess(
  result: AccountRegistrationResult,
): asserts result is Extract<AccountRegistrationResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

function expectFailureCode(
  result: AccountRegistrationResult,
  code: RegistrationErrorCode,
) {
  expect(result).toMatchObject({ ok: false, code });
}

describe("account registration and starting credits contract (RED)", () => {
  it("creates one account and exactly one starting transaction", async () => {
    const subject = createSubject();

    const result = await subject.service.register(validRegistrationInput());

    expectSuccess(result);
    expect(subject.inspectState().accounts).toHaveLength(1);
    expect(subject.inspectState().transactions).toHaveLength(1);
  });

  it("rejects an invalid email without writing state", async () => {
    const subject = createSubject();

    const result = await subject.service.register({
      ...validRegistrationInput(),
      email: "not-an-email",
    });

    expectFailureCode(result, "INVALID_INPUT");
    expect(subject.inspectState()).toEqual({ accounts: [], transactions: [] });
  });

  it("rejects a weak password without writing state", async () => {
    const subject = createSubject();

    const result = await subject.service.register({
      ...validRegistrationInput(),
      password: "too-short",
    });

    expectFailureCode(result, "INVALID_INPUT");
    expect(subject.inspectState()).toEqual({ accounts: [], transactions: [] });
  });

  it("rejects an invalid display name without writing state", async () => {
    const subject = createSubject();

    const result = await subject.service.register({
      ...validRegistrationInput(),
      displayName: " ",
    });

    expectFailureCode(result, "INVALID_INPUT");
    expect(subject.inspectState()).toEqual({ accounts: [], transactions: [] });
  });

  it("rejects an email duplicate after trim and lowercase normalization", async () => {
    const subject = createSubject();

    const first = await subject.service.register(validRegistrationInput());
    const duplicate = await subject.service.register({
      ...validRegistrationInput(),
      displayName: "Grace Spielerin",
      email: "  ADA@EXAMPLE.COM  ",
    });

    expectSuccess(first);
    expectFailureCode(duplicate, "ACCOUNT_UNAVAILABLE");
    expect(subject.inspectState().accounts).toHaveLength(1);
    expect(subject.inspectState().transactions).toHaveLength(1);
  });

  it("never stores the raw password", async () => {
    const subject = createSubject();
    const input = validRegistrationInput();

    const result = await subject.service.register(input);

    expectSuccess(result);
    const [account] = subject.inspectState().accounts;
    expect(account.passwordHash).not.toBe(input.password);
    expect(JSON.stringify(subject.inspectState())).not.toContain(input.password);
  });

  it("uses the central starting-credit policy exactly once", async () => {
    const subject = createSubject();

    const result = await subject.service.register(validRegistrationInput());

    expectSuccess(result);
    expect(result.account.credits).toBe(STARTING_CREDITS);
    expect(subject.inspectState().accounts[0]?.credits).toBe(STARTING_CREDITS);
    expect(subject.inspectState().transactions).toEqual([
      expect.objectContaining({
        delta: STARTING_CREDITS,
        reason: STARTING_CREDIT_REASON,
        resultingBalance: STARTING_CREDITS,
      }),
    ]);
  });

  it("rejects client-selected identity, balance, delta, and reason", async () => {
    const subject = createSubject();
    const untrustedInput: unknown = {
      ...validRegistrationInput(),
      id: "client-selected-user",
      credits: 1_000_000,
      transactionDelta: 1_000_000,
      transactionReason: "ADMIN_GRANT",
    };

    const result = await subject.service.register(untrustedInput);

    expectFailureCode(result, "INVALID_INPUT");
    expect(subject.inspectState()).toEqual({ accounts: [], transactions: [] });
  });

  it.each<AtomicFailurePoint>(["account-write", "ledger-write"])(
    "keeps account, balance, and ledger empty after a failed %s",
    async (failurePoint) => {
      const subject = createSubject();
      subject.failNextWriteAt(failurePoint);

      const result = await subject.service.register(validRegistrationInput());

      expectFailureCode(result, "REGISTRATION_FAILED");
      expect(subject.inspectState()).toEqual({
        accounts: [],
        transactions: [],
      });
    },
  );

  it("never exposes a negative resulting balance", async () => {
    const subject = createSubject();

    const result = await subject.service.register(validRegistrationInput());

    expectSuccess(result);
    expect(result.account.credits).toBeGreaterThanOrEqual(0);
    for (const transaction of subject.inspectState().transactions) {
      expect(transaction.resultingBalance).toBeGreaterThanOrEqual(0);
    }
  });

  it("allows at most one account and starting transaction for concurrent duplicates", async () => {
    const subject = createSubject();

    const results = await Promise.all([
      subject.service.register(validRegistrationInput()),
      subject.service.register({
        ...validRegistrationInput(),
        email: "ADA@example.com",
      }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      results.filter(
        (result) => !result.ok && result.code === "ACCOUNT_UNAVAILABLE",
      ),
    ).toHaveLength(1);
    expect(subject.inspectState().accounts).toHaveLength(1);
    expect(subject.inspectState().transactions).toHaveLength(1);
  });
});
