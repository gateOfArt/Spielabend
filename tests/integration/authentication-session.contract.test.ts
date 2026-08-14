import { describe, expect, it } from "vitest";
import {
  SESSION_POLICY,
  type AuthenticationSessionService,
  type CookieMutationAuthorizationResult,
  type LoginErrorCode,
  type LoginResult,
  type LogoutResult,
  type SessionAuthenticationResult,
  type SessionRecord,
} from "@/server/auth/authentication.contract";

const NOW = new Date("2026-08-14T08:00:00.000Z");
const ACTIVE_SESSION_EXPIRY = new Date(
  NOW.getTime() + SESSION_POLICY.lifetimeMs,
).toISOString();
const EXPIRED_SESSION_EXPIRY = new Date(
  NOW.getTime() - 1,
).toISOString();

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

class NotImplementedAuthenticationSessionService
  implements AuthenticationSessionService
{
  login(credentials: unknown): Promise<LoginResult> {
    void credentials;

    return Promise.resolve({ ok: false, code: "LOGIN_FAILED" });
  }

  authenticate(sessionToken: unknown): Promise<SessionAuthenticationResult> {
    void sessionToken;

    return Promise.resolve({
      ok: true,
      principal: {
        accountId: "not-implemented-account",
        sessionId: "not-implemented-session",
      },
    });
  }

  requireAuthenticatedAccount(
    sessionToken: unknown,
  ): Promise<SessionAuthenticationResult> {
    void sessionToken;

    return Promise.resolve({
      ok: true,
      principal: {
        accountId: "not-implemented-account",
        sessionId: "not-implemented-session",
      },
    });
  }

  logout(sessionToken: unknown): Promise<LogoutResult> {
    void sessionToken;

    return Promise.resolve({ ok: false, code: "LOGOUT_FAILED" });
  }

  authorizeCookieMutation(
    requestEvidence: unknown,
  ): Promise<CookieMutationAuthorizationResult> {
    void requestEvidence;

    return Promise.resolve({
      ok: true,
      principal: {
        accountId: "not-implemented-account",
        sessionId: "not-implemented-session",
      },
    });
  }
}

function createSubject(): AuthenticationTestSubject {
  const accounts: StoredAccountProbe[] = [
    {
      id: "account-1",
      displayName: "Ada Spielerin",
      normalizedEmail: "ada@example.com",
      passwordHash: "$argon2id$test-password-hash",
      credits: 100,
    },
  ];
  const transactions: StoredCreditTransactionProbe[] = [
    {
      id: "transaction-1",
      accountId: "account-1",
      delta: 100,
      resultingBalance: 100,
    },
  ];
  const rounds: StoredGameRoundProbe[] = [
    { id: "existing-round-1", accountId: "account-1" },
  ];
  const sessions: SessionRecord[] = [];
  const passwordComparisons: PasswordComparisonProbe[] = [];
  let nextSessionId = 0;

  return {
    service: new NotImplementedAuthenticationSessionService(),
    seedSession({
      token,
      expiresAt = ACTIVE_SESSION_EXPIRY,
      accountId = "account-1",
    }) {
      void token;
      nextSessionId += 1;
      sessions.push({
        id: `seeded-session-${nextSessionId}`,
        accountId,
        tokenHash: `seeded-token-hash-${nextSessionId}`,
        createdAt: NOW.toISOString(),
        expiresAt,
      });
    },
    inspectState() {
      return {
        accounts: accounts.map((account) => ({ ...account })),
        transactions: transactions.map((transaction) => ({ ...transaction })),
        rounds: rounds.map((round) => ({ ...round })),
        sessions: sessions.map((session) => ({ ...session })),
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
    password: "correct horse battery staple",
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

describe("authentication, sessions, and logout contract (RED)", () => {
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
        password: "correct horse battery staple",
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
    { caseName: "unknown", token: "unknown-session-token", seed: false },
    { caseName: "expired", token: "expired-session-token", seed: true },
  ])("rejects an $caseName session", async ({ token, seed }) => {
    const subject = createSubject();

    if (seed) {
      subject.seedSession({ token, expiresAt: EXPIRED_SESSION_EXPIRY });
    }

    const result = await subject.service.authenticate(token);

    expectAuthenticationRequired(result);
  });

  it.each([null, "unknown-session-token"])(
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
    subject.seedSession({ token: "current-session-token" });
    subject.seedSession({ token: "second-session-token" });

    const result = await subject.service.logout("current-session-token");

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
    subject.seedSession({ token: "current-session-token" });

    const first = await subject.service.logout("current-session-token");
    const repeated = await subject.service.logout("current-session-token");

    expectLogoutSuccess(first);
    expectLogoutSuccess(repeated);
    expect(first.cookie.maxAge).toBe(0);
    expect(repeated.cookie.maxAge).toBe(0);
    expect(subject.inspectState().sessions).toHaveLength(0);
  });

  it("retains accounts, credits, transactions, and rounds after logout", async () => {
    const subject = createSubject();
    subject.seedSession({ token: "current-session-token" });
    const before = subject.inspectState();

    const result = await subject.service.logout("current-session-token");

    expectLogoutSuccess(result);
    const after = subject.inspectState();
    expect(after.accounts).toEqual(before.accounts);
    expect(after.accounts[0]?.credits).toBe(100);
    expect(after.transactions).toEqual(before.transactions);
    expect(after.rounds).toEqual(before.rounds);
  });

  it("does not invalidate a second session during current-session logout", async () => {
    const subject = createSubject();
    subject.seedSession({ token: "current-session-token" });
    subject.seedSession({ token: "second-session-token" });

    const result = await subject.service.logout("current-session-token");

    expectLogoutSuccess(result);
    expect(subject.inspectState().sessions).toEqual([
      expect.objectContaining({ id: "seeded-session-2" }),
    ]);
    await expect(
      subject.service.authenticate("second-session-token"),
    ).resolves.toMatchObject({ ok: true });
  });

  it.each([
    {
      caseName: "missing Origin",
      evidence: {
        method: "POST",
        origin: null,
        secFetchSite: "same-origin",
        sessionToken: "current-session-token",
      },
    },
    {
      caseName: "cross-site Origin",
      evidence: {
        method: "DELETE",
        origin: "https://attacker.example",
        secFetchSite: "cross-site",
        sessionToken: "current-session-token",
      },
    },
  ])(
    "rejects an unsafe cookie-authenticated request with $caseName",
    async ({ evidence }) => {
      const subject = createSubject();
      subject.seedSession({ token: "current-session-token" });

      const result = await subject.service.authorizeCookieMutation(evidence);

      expect(result).toEqual({ ok: false, code: "UNSAFE_REQUEST" });
    },
  );
});
