import { describe, expect, it, vi } from "vitest";
import { createLoginActionHandler } from "@/app/login/action-handler";
import { createLogoutActionHandler } from "@/app/logout/action-handler";
import {
  initialLoginActionState,
  initialLogoutActionState,
} from "@/domain/authentication";
import {
  SESSION_POLICY,
  type AuthenticationSessionService,
  type ExpiredSessionCookie,
  type LoginResult,
  type LogoutResult,
  type SessionCookie,
} from "@/server/auth/authentication.contract";
import type { RateLimiter } from "@/server/rate-limit/rate-limiter";

function allowingRateLimiter(): Pick<RateLimiter, "consume"> {
  return { consume: () => ({ allowed: true }) };
}

const resolveClientKey = () => "test-client";

const SESSION_TOKEN = Buffer.alloc(32, 42).toString("base64url");
const EXPIRES_AT = "2026-08-14T16:00:00.000Z";

const sessionCookie: SessionCookie = {
  name: SESSION_POLICY.cookie.name,
  value: SESSION_TOKEN,
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  path: "/",
  expires: EXPIRES_AT,
};

const expiredSessionCookie: ExpiredSessionCookie = {
  ...sessionCookie,
  value: "",
  expires: new Date(0).toISOString(),
  maxAge: 0,
};

function createService({
  loginResult = {
    ok: true,
    account: { displayName: "Ada Spielerin", credits: 100 },
    session: { token: SESSION_TOKEN, expiresAt: EXPIRES_AT },
    cookie: sessionCookie,
  },
  logoutResult = { ok: true, cookie: expiredSessionCookie },
}: {
  readonly loginResult?: LoginResult;
  readonly logoutResult?: LogoutResult;
} = {}) {
  const login = vi.fn<AuthenticationSessionService["login"]>(() =>
    Promise.resolve(loginResult),
  );
  const logout = vi.fn<AuthenticationSessionService["logout"]>(() =>
    Promise.resolve(logoutResult),
  );
  const authenticationRequired = vi.fn<
    AuthenticationSessionService["authenticate"]
  >(() =>
    Promise.resolve({ ok: false, code: "AUTHENTICATION_REQUIRED" }),
  );

  const service: AuthenticationSessionService = {
    login,
    authenticate: authenticationRequired,
    requireAuthenticatedAccount: authenticationRequired,
    logout,
    authorizeCookieMutation: vi.fn<
      AuthenticationSessionService["authorizeCookieMutation"]
    >(() =>
      Promise.resolve({
        ok: false as const,
        code: "AUTHENTICATION_REQUIRED" as const,
      }),
    ),
  };

  return { service, login, logout };
}

function loginFormData(
  values: Partial<Record<"email" | "password", string>> = {},
) {
  const formData = new FormData();
  formData.set("email", values.email ?? "ada@example.com");
  formData.set(
    "password",
    values.password ?? "correct horse battery staple",
  );
  return formData;
}

describe("login action boundary", () => {
  it("sets the server cookie and returns no credential or session material", async () => {
    const { service } = createService();
    const setSessionCookie = vi.fn();
    const action = createLoginActionHandler({
      authenticationService: service,
      isRequestOriginAllowed: () => true,
      setSessionCookie,
      rateLimiter: allowingRateLimiter(),
      resolveClientKey,
    });

    const state = await action(initialLoginActionState, loginFormData());

    expect(state).toEqual({ status: "success" });
    expect(setSessionCookie).toHaveBeenCalledWith(sessionCookie);
    expect(JSON.stringify(state)).not.toContain(SESSION_TOKEN);
    expect(JSON.stringify(state)).not.toContain("password");
  });

  it.each([
    {
      caseName: "wrong credentials",
      formData: loginFormData(),
      loginResult: {
        ok: false,
        code: "INVALID_CREDENTIALS",
      } satisfies LoginResult,
    },
    {
      caseName: "malformed credentials",
      formData: loginFormData({ email: "not-an-email" }),
      loginResult: undefined,
    },
  ])("returns the same neutral error for $caseName", async (testCase) => {
    const { service } = createService({
      loginResult: testCase.loginResult,
    });
    const action = createLoginActionHandler({
      authenticationService: service,
      isRequestOriginAllowed: () => true,
      setSessionCookie: vi.fn(),
      rateLimiter: allowingRateLimiter(),
      resolveClientKey,
    });

    const state = await action(initialLoginActionState, testCase.formData);

    expect(state).toEqual({
      status: "error",
      message: "E-Mail-Adresse oder Passwort ist ungültig.",
    });
  });

  it("rejects an unsafe origin and unexpected client fields before login", async () => {
    const { service, login } = createService();
    const unsafeAction = createLoginActionHandler({
      authenticationService: service,
      isRequestOriginAllowed: () => false,
      setSessionCookie: vi.fn(),
      rateLimiter: allowingRateLimiter(),
      resolveClientKey,
    });
    const extraFieldAction = createLoginActionHandler({
      authenticationService: service,
      isRequestOriginAllowed: () => true,
      setSessionCookie: vi.fn(),
      rateLimiter: allowingRateLimiter(),
      resolveClientKey,
    });
    const formData = loginFormData();
    formData.set("accountId", "client-selected-account");

    const unsafeState = await unsafeAction(
      initialLoginActionState,
      loginFormData(),
    );
    const extraFieldState = await extraFieldAction(
      initialLoginActionState,
      formData,
    );

    expect(unsafeState.status).toBe("error");
    expect(extraFieldState.status).toBe("error");
    expect(login).not.toHaveBeenCalled();
  });

  it("blocks a login attempt once the rate limit is exceeded without calling the service", async () => {
    const { service, login } = createService();
    const consume = vi.fn(() => ({
      allowed: false as const,
      retryAfterSeconds: 42,
    }));
    const action = createLoginActionHandler({
      authenticationService: service,
      isRequestOriginAllowed: () => true,
      setSessionCookie: vi.fn(),
      rateLimiter: { consume },
      resolveClientKey: () => "203.0.113.5",
    });

    const state = await action(initialLoginActionState, loginFormData());

    expect(state).toEqual({
      status: "error",
      message: "Zu viele Anmeldeversuche. Bitte versuche es in Kürze erneut.",
    });
    expect(consume).toHaveBeenCalledWith(
      "login:203.0.113.5:ada@example.com",
    );
    expect(login).not.toHaveBeenCalled();
  });
});

describe("logout action boundary", () => {
  it("rechecks the request, revokes the current session, and expires its cookie", async () => {
    const { service, logout } = createService();
    const setExpiredSessionCookie = vi.fn();
    const authorizeRequest = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        principal: { accountId: "account-1", sessionId: "session-1" },
      }),
    );
    const action = createLogoutActionHandler({
      authenticationService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest,
      setExpiredSessionCookie,
    });

    const state = await action(initialLogoutActionState, new FormData());

    expect(state).toEqual({ status: "success" });
    expect(authorizeRequest).toHaveBeenCalledWith(SESSION_TOKEN);
    expect(logout).toHaveBeenCalledWith(SESSION_TOKEN);
    expect(setExpiredSessionCookie).toHaveBeenCalledWith(expiredSessionCookie);
  });

  it("handles an already invalid session by clearing the cookie again", async () => {
    const { service, logout } = createService();
    const setExpiredSessionCookie = vi.fn();
    const action = createLogoutActionHandler({
      authenticationService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest: () =>
        Promise.resolve({
          ok: false,
          code: "AUTHENTICATION_REQUIRED" as const,
        }),
      setExpiredSessionCookie,
    });

    const state = await action(initialLogoutActionState, new FormData());

    expect(state).toEqual({ status: "success" });
    expect(logout).toHaveBeenCalledWith(SESSION_TOKEN);
    expect(setExpiredSessionCookie).toHaveBeenCalledOnce();
  });

  it("rejects unsafe or client-extended logout requests before revocation", async () => {
    const { service, logout } = createService();
    const unsafeAction = createLogoutActionHandler({
      authenticationService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest: () =>
        Promise.resolve({ ok: false, code: "UNSAFE_REQUEST" as const }),
      setExpiredSessionCookie: vi.fn(),
    });
    const extraFieldAction = createLogoutActionHandler({
      authenticationService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest: vi.fn(),
      setExpiredSessionCookie: vi.fn(),
    });
    const formData = new FormData();
    formData.set("sessionToken", "client-selected-token");

    const unsafeState = await unsafeAction(
      initialLogoutActionState,
      new FormData(),
    );
    const extraFieldState = await extraFieldAction(
      initialLogoutActionState,
      formData,
    );

    expect(unsafeState.status).toBe("error");
    expect(extraFieldState.status).toBe("error");
    expect(logout).not.toHaveBeenCalled();
  });
});
