import { describe, expect, it } from "vitest";
import {
  SESSION_POLICY,
  type AuthenticationSessionService,
  type LoginErrorCode,
  type LoginResult,
  type LogoutResult,
  type SessionAuthenticationResult,
  type SessionRecord,
} from "@/server/auth/authentication.contract";
import { Sha256SessionTokenHasher } from "@/server/auth/session-crypto";
import { creditPolicy } from "@/domain/credits";
import { AccountRepository } from "@/server/repositories/account-repository";
import { CreditTransactionRepository } from "@/server/repositories/credit-transaction-repository";
import { SessionRepository } from "@/server/repositories/session-repository";
import { DefaultAuthenticationSessionService } from "@/server/services/authentication-session";
import { RuntimeUnitOfWork } from "@/server/services/runtime-unit-of-work";
import { InMemoryStore } from "@/server/store/in-memory-store";

const NOW = new Date("2026-08-14T08:00:00.000Z");
const ACTIVE_SESSION_EXPIRY = new Date(
  NOW.getTime() + SESSION_POLICY.lifetimeMs,
).toISOString();
const EXPIRED_SESSION_EXPIRY = new Date(
  NOW.getTime() - 1,
).toISOString();
const CORRECT_PASSWORD = "correct horse battery staple";
const PASSWORD_HASH = "$argon2id$test-password-hash";
const CURRENT_SESSION_TOKEN = Buffer.alloc(32, 201).toString("base64url");
const SECOND_SESSION_TOKEN = Buffer.alloc(32, 202).toString("base64url");
const EXPIRED_SESSION_TOKEN = Buffer.alloc(32, 203).toString("base64url");
const UNKNOWN_SESSION_TOKEN = Buffer.alloc(32, 204).toString("base64url");

interface StoredAccountProbe {
  readonly id: string;
  readonly displayName: string;
  readonly normalizedEmail: string;
  readonly passwordHash: string;
  readonly credits: number;
}

interface StoredCreditTransactionProbe {
  readonly id: string;
  readonly accountId: string;
  readonly delta: number;
  readonly resultingBalance: number;
}

interface StoredGameRoundProbe {
  readonly id: string;
  readonly accountId: string;
}

interface AuthenticationStateProbe {
  readonly accounts: readonly StoredAccountProbe[];
  readonly transactions: readonly StoredCreditTransactionProbe[];
  readonly rounds: readonly StoredGameRoundProbe[];
  readonly sessions: readonly SessionRecord[];
}

interface PasswordComparisonProbe {
  readonly passwordHash: string;
  readonly candidatePassword: string;
}

interface SeedSessionOptions {
  readonly token: string;
  readonly expiresAt?: string;
  readonly accountId?: string;
}

interface AuthenticationTestSubject {
  readonly service: AuthenticationSessionService;
  seedSession(options: SeedSessionOptions): void;
  inspectState(): AuthenticationStateProbe;
  inspectPasswordComparisons(): readonly PasswordComparisonProbe[];
}

function createSubject(): AuthenticationTestSubject {
  const store = new InMemoryStore();
  const accountRepository = new AccountRepository(store);
  const transactionRepository = new CreditTransactionRepository(store);
  const sessionRepository = new SessionRepository(store);
  const tokenHasher = new Sha256SessionTokenHasher();
  const passwordComparisons: PasswordComparisonProbe[] = [];
  const rounds: StoredGameRoundProbe[] = [
    { id: "existing-round-1", accountId: "account-1" },
  ];
  let nextSessionId = 0;
  let nextTokenSeed = 0;
  const unitOfWork = new RuntimeUnitOfWork({
    store,
    creditPolicy,
    generateId: (() => {
      let nextAccountWriteId = 0;

      return () => {
        nextAccountWriteId += 1;
        return nextAccountWriteId === 1
          ? "account-1"
          : `account-write-${nextAccountWriteId}`;
      };
    })(),
    now: () => NOW,
  });
  unitOfWork.createAccountWithStartingCredit({
    displayName: "Ada Spielerin",
    normalizedEmail: "ada@example.com",
    passwordHash: PASSWORD_HASH,
  });
  const service: AuthenticationSessionService =
    new DefaultAuthenticationSessionService({
      accountRepository,
      sessionRepository,
      passwordVerifier: {
        verify(passwordHash, candidatePassword) {
          passwordComparisons.push({ passwordHash, candidatePassword });

          return Promise.resolve(
            passwordHash === PASSWORD_HASH &&
              candidatePassword === CORRECT_PASSWORD,
          );
        },
      },
      tokenGenerator: {
        generate() {
          nextTokenSeed += 1;
          return Buffer.alloc(32, nextTokenSeed).toString("base64url");
        },
      },
      tokenHasher,
      generateId: () => `session-${(nextSessionId += 1)}`,
      now: () => NOW,
      isProduction: true,
    });

  return {
    service,
    seedSession({
      token,
      expiresAt = ACTIVE_SESSION_EXPIRY,
      accountId = "account-1",
    }) {
      nextSessionId += 1;
      sessionRepository.create({
        id: `seeded-session-${nextSessionId}`,
        accountId,
        tokenHash: tokenHasher.hash(token),
        createdAt: new Date(
          Date.parse(expiresAt) - SESSION_POLICY.lifetimeMs,
        ).toISOString(),
        expiresAt,
      });
    },
    inspectState() {
      return {
        accounts: accountRepository.listAll(),
        transactions: transactionRepository.listAll(),
        rounds: rounds.map((round) => ({ ...round })),
        sessions: sessionRepository.listAll(),
      };
    },
    inspectPasswordComparisons() {
      return passwordComparisons.map((comparison) => ({ ...comparison }));
    },
  };
}

function validCredentials() {
  return {
    email: " ADA@EXAMPLE.COM ",
    password: CORRECT_PASSWORD,
  };
}

function expectLoginSuccess(
  result: LoginResult,
): asserts result is Extract<LoginResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

function expectLoginFailure(result: LoginResult, code: LoginErrorCode) {
  expect(result).toEqual({ ok: false, code });
}

function expectAuthenticationRequired(result: SessionAuthenticationResult) {
  expect(result).toEqual({
    ok: false,
    code: "AUTHENTICATION_REQUIRED",
  });
}

function expectLogoutSuccess(
  result: LogoutResult,
): asserts result is Extract<LogoutResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

describe("authentication, sessions, and logout contract", () => {
  it("creates exactly one server-side session for valid credentials", async () => {
    const subject = createSubject();

    const result = await subject.service.login(validCredentials());

    expectLoginSuccess(result);
    expect(subject.inspectState().sessions).toHaveLength(1);
    expect(subject.inspectState().sessions[0]?.accountId).toBe("account-1");
  });

  it.each([
    {
      caseName: "wrong password",
      credentials: { ...validCredentials(), password: "wrong password" },
    },
    {
      caseName: "unknown account",
      credentials: {
        email: "unknown@example.com",
        password: CORRECT_PASSWORD,
      },
    },
    {
      caseName: "malformed credentials",
      credentials: { email: "not-an-email" },
    },
  ])("returns the same neutral error for $caseName", async ({ credentials }) => {
    const subject = createSubject();

    const result = await subject.service.login(credentials);

    expectLoginFailure(result, "INVALID_CREDENTIALS");
    expect(subject.inspectState().sessions).toHaveLength(0);
    expect(JSON.stringify(result)).not.toContain("unknown@example.com");
  });

  it("uses safe password verification for wrong and unknown accounts", async () => {
    const subject = createSubject();
    const candidatePassword = "wrong but sufficiently long password";

    const wrongPassword = await subject.service.login({
      email: "ada@example.com",
      password: candidatePassword,
    });
    const unknownAccount = await subject.service.login({
      email: "unknown@example.com",
      password: candidatePassword,
    });

    expect(subject.inspectPasswordComparisons()).toHaveLength(2);
    expect(
      subject
        .inspectPasswordComparisons()
        .map((comparison) => comparison.candidatePassword),
    ).toEqual([candidatePassword, candidatePassword]);
    for (const comparison of subject.inspectPasswordComparisons()) {
      expect(comparison.passwordHash).toMatch(/^\$argon2id\$/);
    }
    expectLoginFailure(wrongPassword, "INVALID_CREDENTIALS");
    expectLoginFailure(unknownAccount, "INVALID_CREDENTIALS");
  });

  it("keeps password hashes and session tokens out of the client account DTO", async () => {
    const subject = createSubject();

    const result = await subject.service.login(validCredentials());

    expectLoginSuccess(result);
    const clientDto = JSON.stringify(result.account);
    expect(Object.keys(result.account).sort()).toEqual([
      "credits",
      "displayName",
    ]);
    expect(clientDto).not.toContain(
      subject.inspectState().accounts[0]?.passwordHash,
    );
    expect(clientDto).not.toContain(result.session.token);
  });

  it("issues distinct opaque tokens, persists only hashes, and uses the production cookie policy", async () => {
    const subject = createSubject();

    const first = await subject.service.login(validCredentials());
    const second = await subject.service.login(validCredentials());

    expectLoginSuccess(first);
    expectLoginSuccess(second);
    expect(first.session.token).not.toBe(second.session.token);
    expect(Buffer.from(first.session.token, "base64url")).toHaveLength(
      SESSION_POLICY.tokenEntropyBytes,
    );
    expect(first.cookie).toMatchObject({
      name: SESSION_POLICY.cookie.name,
      value: first.session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      expires: first.session.expiresAt,
    });
    expect(
      new Date(first.session.expiresAt).getTime() - NOW.getTime(),
    ).toBe(SESSION_POLICY.lifetimeMs);
    expect(subject.inspectState().sessions).toHaveLength(2);
    expect(JSON.stringify(subject.inspectState().sessions)).not.toContain(
      first.session.token,
    );
    expect(JSON.stringify(subject.inspectState().sessions)).not.toContain(
      second.session.token,
    );
  });

  it.each([
    { caseName: "unknown", token: UNKNOWN_SESSION_TOKEN, seed: false },
    { caseName: "expired", token: EXPIRED_SESSION_TOKEN, seed: true },
  ])("rejects an $caseName session", async ({ token, seed }) => {
    const subject = createSubject();

    if (seed) {
      subject.seedSession({ token, expiresAt: EXPIRED_SESSION_EXPIRY });
    }

    const result = await subject.service.authenticate(token);

    expectAuthenticationRequired(result);
  });

  it.each([null, UNKNOWN_SESSION_TOKEN])(
    "rejects protected access without a valid session (%s)",
    async (sessionToken) => {
      const subject = createSubject();

      const result = await subject.service.requireAuthenticatedAccount(
        sessionToken,
      );

      expectAuthenticationRequired(result);
    },
  );

  it("invalidates only the current session and expires its cookie", async () => {
    const subject = createSubject();
    subject.seedSession({ token: CURRENT_SESSION_TOKEN });
    subject.seedSession({ token: SECOND_SESSION_TOKEN });

    const result = await subject.service.logout(CURRENT_SESSION_TOKEN);

    expectLogoutSuccess(result);
    expect(result.cookie).toMatchObject({
      name: SESSION_POLICY.cookie.name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 0,
    });
    expect(new Date(result.cookie.expires).getTime()).toBeLessThanOrEqual(
      NOW.getTime(),
    );
    expect(subject.inspectState().sessions).toHaveLength(1);
    expect(subject.inspectState().sessions[0]?.id).toBe("seeded-session-2");
  });

  it("handles repeated logout idempotently", async () => {
    const subject = createSubject();
    subject.seedSession({ token: CURRENT_SESSION_TOKEN });

    const first = await subject.service.logout(CURRENT_SESSION_TOKEN);
    const repeated = await subject.service.logout(CURRENT_SESSION_TOKEN);

    expectLogoutSuccess(first);
    expectLogoutSuccess(repeated);
    expect(first.cookie.maxAge).toBe(0);
    expect(repeated.cookie.maxAge).toBe(0);
    expect(subject.inspectState().sessions).toHaveLength(0);
  });

  it("retains accounts, credits, transactions, and rounds after logout", async () => {
    const subject = createSubject();
    subject.seedSession({ token: CURRENT_SESSION_TOKEN });
    const before = subject.inspectState();

    const result = await subject.service.logout(CURRENT_SESSION_TOKEN);

    expectLogoutSuccess(result);
    const after = subject.inspectState();
    expect(after.accounts).toEqual(before.accounts);
    expect(after.accounts[0]?.credits).toBe(100);
    expect(after.transactions).toEqual(before.transactions);
    expect(after.rounds).toEqual(before.rounds);
  });

  it("does not invalidate a second session during current-session logout", async () => {
    const subject = createSubject();
    subject.seedSession({ token: CURRENT_SESSION_TOKEN });
    subject.seedSession({ token: SECOND_SESSION_TOKEN });

    const result = await subject.service.logout(CURRENT_SESSION_TOKEN);

    expectLogoutSuccess(result);
    expect(subject.inspectState().sessions).toEqual([
      expect.objectContaining({ id: "seeded-session-2" }),
    ]);
    await expect(
      subject.service.authenticate(SECOND_SESSION_TOKEN),
    ).resolves.toMatchObject({ ok: true });
  });

  it.each([
    {
      caseName: "missing Origin",
      evidence: {
        method: "POST",
        origin: null,
        trustedOrigin: "https://spieleabend.example",
        secFetchSite: "same-origin",
        sessionToken: CURRENT_SESSION_TOKEN,
      },
    },
    {
      caseName: "cross-site Origin",
      evidence: {
        method: "DELETE",
        origin: "https://attacker.example",
        trustedOrigin: "https://spieleabend.example",
        secFetchSite: "cross-site",
        sessionToken: CURRENT_SESSION_TOKEN,
      },
    },
  ])(
    "rejects an unsafe cookie-authenticated request with $caseName",
    async ({ evidence }) => {
      const subject = createSubject();
      subject.seedSession({ token: CURRENT_SESSION_TOKEN });

      const result = await subject.service.authorizeCookieMutation(evidence);

      expect(result).toEqual({ ok: false, code: "UNSAFE_REQUEST" });
    },
  );

  it("authorizes a same-origin mutation with a valid current session", async () => {
    const subject = createSubject();
    subject.seedSession({ token: CURRENT_SESSION_TOKEN });

    const result = await subject.service.authorizeCookieMutation({
      method: "POST",
      origin: "https://spieleabend.example",
      trustedOrigin: "https://spieleabend.example",
      secFetchSite: "same-origin",
      sessionToken: CURRENT_SESSION_TOKEN,
    });

    expect(result).toEqual({
      ok: true,
      principal: {
        accountId: "account-1",
        sessionId: "seeded-session-1",
      },
    });
  });
});
