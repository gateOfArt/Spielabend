import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/server/auth/authentication.contract";
import {
  createCoreApiHandlers,
  type CoreApiHandlerProps,
} from "@/server/api/core-route-handlers";

const SESSION_TOKEN = Buffer.alloc(32, 44).toString("base64url");
const REQUEST_ID = "b9c32417-0e18-4bb4-bfa7-a50d0981fcbb";
const ORIGIN = "https://spieleabend.example";

const round = {
  requestId: REQUEST_ID,
  bet: 10,
  prediction: 4,
  result: 4,
  outcome: "win" as const,
  netDelta: 50,
  finalCredits: 150,
};

interface RequestOptions {
  readonly method?: "GET" | "POST" | "DELETE";
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly withSession?: boolean;
}

function apiRequest(path: string, options: RequestOptions = {}): NextRequest {
  const headers = new Headers(options.headers);

  if (options.withSession !== false) {
    headers.set(
      "cookie",
      `${SESSION_POLICY.cookie.name}=${SESSION_TOKEN}`,
    );
  }

  let body: string | undefined;

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.body);
  }

  return new NextRequest(`${ORIGIN}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });
}

function validMutationHeaders(): Readonly<Record<string, string>> {
  return {
    host: "spieleabend.example",
    origin: ORIGIN,
    "sec-fetch-site": "same-origin",
  };
}

function validDiceBody() {
  return {
    game: "DICE",
    requestId: REQUEST_ID,
    input: { bet: 10, prediction: 4 },
  };
}

function createSubject(overrides: Partial<CoreApiHandlerProps> = {}) {
  const authenticationService: CoreApiHandlerProps["authenticationService"] = {
    requireAuthenticatedAccount: vi.fn<
      CoreApiHandlerProps["authenticationService"]["requireAuthenticatedAccount"]
    >(() =>
      Promise.resolve({
        ok: true,
        principal: { accountId: "account-1", sessionId: "session-1" },
      }),
    ),
    authorizeCookieMutation: vi.fn<
      CoreApiHandlerProps["authenticationService"]["authorizeCookieMutation"]
    >(() =>
      Promise.resolve({
        ok: true,
        principal: { accountId: "account-1", sessionId: "session-1" },
      }),
    ),
    logout: vi.fn<
      CoreApiHandlerProps["authenticationService"]["logout"]
    >(() =>
      Promise.resolve({
        ok: true,
        cookie: {
          name: SESSION_POLICY.cookie.name,
          value: "",
          httpOnly: true,
          sameSite: SESSION_POLICY.cookie.sameSite,
          secure: true,
          path: SESSION_POLICY.cookie.path,
          expires: new Date(0).toISOString(),
          maxAge: 0,
        },
      }),
    ),
  };
  const currentUserQueryService: CoreApiHandlerProps["currentUserQueryService"] = {
    read: vi.fn<CoreApiHandlerProps["currentUserQueryService"]["read"]>(() =>
      Promise.resolve({
        ok: true,
        user: { displayName: "Ada", credits: 150 },
      }),
    ),
  };
  const leaderboardQueryService: CoreApiHandlerProps["leaderboardQueryService"] = {
    read: vi.fn<CoreApiHandlerProps["leaderboardQueryService"]["read"]>(() =>
      Promise.resolve({
        ok: true,
        currentUser: { displayName: "Ada", credits: 150 },
        entries: [
          {
            rank: 1,
            displayName: "Ada",
            credits: 150,
            isCurrentUser: true,
          },
        ],
      }),
    ),
  };
  const gameRoundQueryService: CoreApiHandlerProps["gameRoundQueryService"] = {
    read: vi.fn<CoreApiHandlerProps["gameRoundQueryService"]["read"]>(() =>
      Promise.resolve({
        ok: true,
        rounds: [
          {
            game: "DICE",
            ...round,
            createdAt: "2026-08-15T10:00:00.000Z",
          },
        ],
      }),
    ),
  };
  const diceRoundService: CoreApiHandlerProps["diceRoundService"] = {
    play: vi.fn<CoreApiHandlerProps["diceRoundService"]["play"]>(() =>
      Promise.resolve({ ok: true, replayed: false, round }),
    ),
  };
  const props: CoreApiHandlerProps = {
    authenticationService,
    currentUserQueryService,
    leaderboardQueryService,
    gameRoundQueryService,
    diceRoundService,
    ...overrides,
  };

  return { props, handlers: createCoreApiHandlers(props) };
}

async function expectProblem(
  response: Response,
  status: number,
  code: string,
) {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain(
    "application/problem+json",
  );
  expect(await response.json()).toMatchObject({
    type: "about:blank",
    status,
    code,
  });
}

describe("core resource-oriented API handlers", () => {
  it("returns the current user's safe public resource", async () => {
    const subject = createSubject();

    const response = await subject.handlers.getCurrentUser(
      apiRequest("/api/v1/users/me"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { displayName: "Ada", credits: 150 },
    });
    expect(subject.props.currentUserQueryService.read).toHaveBeenCalledWith(
      SESSION_TOKEN,
    );
  });

  it("returns the safe ranked leaderboard resource", async () => {
    const subject = createSubject();

    const response = await subject.handlers.getLeaderboard(
      apiRequest("/api/v1/leaderboard"),
    );

    expect(response.status).toBe(200);
    const serialized = JSON.stringify(await response.json());
    expect(serialized).toContain('"displayName":"Ada"');
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("normalizedEmail");
    expect(serialized).not.toContain(SESSION_TOKEN);
  });

  it("returns only current-user game rounds as safe resources", async () => {
    const subject = createSubject();

    const response = await subject.handlers.getGameRounds(
      apiRequest("/api/v1/game-rounds"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { rounds: [expect.objectContaining({ game: "DICE" })] },
    });
  });

  it.each([
    ["current user", "getCurrentUser"],
    ["leaderboard", "getLeaderboard"],
    ["game rounds", "getGameRounds"],
  ] as const)("rejects an unauthenticated %s read", async (_label, method) => {
    const authenticationService: CoreApiHandlerProps["authenticationService"] = {
      ...createSubject().props.authenticationService,
      requireAuthenticatedAccount: vi.fn<
        CoreApiHandlerProps["authenticationService"]["requireAuthenticatedAccount"]
      >(() =>
        Promise.resolve({ ok: false, code: "AUTHENTICATION_REQUIRED" }),
      ),
    };
    const subject = createSubject({ authenticationService });

    const response = await subject.handlers[method](
      apiRequest(`/api/v1/${method}`, { withSession: false }),
    );

    await expectProblem(response, 401, "AUTHENTICATION_REQUIRED");
  });

  it("rejects unsupported query parameters", async () => {
    const subject = createSubject();

    const response = await subject.handlers.getGameRounds(
      apiRequest("/api/v1/game-rounds?accountId=account-foreign"),
    );

    await expectProblem(response, 422, "INVALID_REQUEST");
    expect(subject.props.gameRoundQueryService.read).not.toHaveBeenCalled();
  });

  it("dispatches an allowed Dice round and returns 201", async () => {
    const subject = createSubject();

    const response = await subject.handlers.postGameRound(
      apiRequest("/api/v1/game-rounds", {
        method: "POST",
        headers: validMutationHeaders(),
        body: validDiceBody(),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      data: { round: { game: "DICE", ...round } },
    });
    expect(subject.props.diceRoundService.play).toHaveBeenCalledWith(
      SESSION_TOKEN,
      { requestId: REQUEST_ID, bet: 10, prediction: 4 },
    );
  });

  it("returns 200 for an idempotently replayed Dice round", async () => {
    const diceRoundService: CoreApiHandlerProps["diceRoundService"] = {
      play: vi.fn<CoreApiHandlerProps["diceRoundService"]["play"]>(() =>
        Promise.resolve({ ok: true, replayed: true, round }),
      ),
    };
    const subject = createSubject({ diceRoundService });

    const response = await subject.handlers.postGameRound(
      apiRequest("/api/v1/game-rounds", {
        method: "POST",
        headers: validMutationHeaders(),
        body: validDiceBody(),
      }),
    );

    expect(response.status).toBe(200);
  });

  it.each([
    {
      label: "unsupported game",
      body: { ...validDiceBody(), game: "ROULETTE" },
    },
    {
      label: "client-selected authority",
      body: {
        ...validDiceBody(),
        userId: "account-foreign",
        result: 6,
        payout: 1_000,
        delta: 1_000,
        finalCredits: 1_000,
      },
    },
  ])("rejects $label before dispatch", async ({ body }) => {
    const subject = createSubject();

    const response = await subject.handlers.postGameRound(
      apiRequest("/api/v1/game-rounds", {
        method: "POST",
        headers: validMutationHeaders(),
        body,
      }),
    );

    await expectProblem(response, 422, "INVALID_REQUEST");
    expect(subject.props.diceRoundService.play).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with the shared problem shape", async () => {
    const subject = createSubject();
    const request = new NextRequest(`${ORIGIN}/api/v1/game-rounds`, {
      method: "POST",
      headers: {
        ...validMutationHeaders(),
        cookie: `${SESSION_POLICY.cookie.name}=${SESSION_TOKEN}`,
        "content-type": "application/json",
      },
      body: "{",
    });

    const response = await subject.handlers.postGameRound(request);

    await expectProblem(response, 422, "INVALID_REQUEST");
  });

  it("rejects a POST body with an unsupported media type", async () => {
    const subject = createSubject();
    const request = new NextRequest(`${ORIGIN}/api/v1/game-rounds`, {
      method: "POST",
      headers: {
        ...validMutationHeaders(),
        cookie: `${SESSION_POLICY.cookie.name}=${SESSION_TOKEN}`,
        "content-type": "text/plain",
      },
      body: JSON.stringify(validDiceBody()),
    });

    const response = await subject.handlers.postGameRound(request);

    await expectProblem(response, 422, "INVALID_REQUEST");
    expect(subject.props.diceRoundService.play).not.toHaveBeenCalled();
  });

  it.each([
    ["INVALID_INPUT", 422, "INVALID_REQUEST"],
    ["INSUFFICIENT_CREDITS", 422, "INVALID_REQUEST"],
    ["REQUEST_CONFLICT", 409, "REQUEST_CONFLICT"],
    ["ROUND_FAILED", 500, "REQUEST_FAILED"],
  ] as const)("maps Dice %s safely", async (serviceCode, status, apiCode) => {
    const diceRoundService: CoreApiHandlerProps["diceRoundService"] = {
      play: vi.fn<CoreApiHandlerProps["diceRoundService"]["play"]>(() =>
        Promise.resolve({ ok: false, code: serviceCode }),
      ),
    };
    const subject = createSubject({ diceRoundService });

    const response = await subject.handlers.postGameRound(
      apiRequest("/api/v1/game-rounds", {
        method: "POST",
        headers: validMutationHeaders(),
        body: validDiceBody(),
      }),
    );

    await expectProblem(response, status, apiCode);
  });

  it.each([
    ["UNSAFE_REQUEST", 403, "FORBIDDEN"],
    ["AUTHENTICATION_REQUIRED", 401, "AUTHENTICATION_REQUIRED"],
  ] as const)(
    "rejects POST authorization code %s",
    async (authorizationCode, status, apiCode) => {
      const authenticationService: CoreApiHandlerProps["authenticationService"] = {
        ...createSubject().props.authenticationService,
        authorizeCookieMutation: vi.fn<
          CoreApiHandlerProps["authenticationService"]["authorizeCookieMutation"]
        >(() =>
          Promise.resolve({ ok: false, code: authorizationCode }),
        ),
      };
      const subject = createSubject({ authenticationService });

      const response = await subject.handlers.postGameRound(
        apiRequest("/api/v1/game-rounds", {
          method: "POST",
          headers: validMutationHeaders(),
          body: validDiceBody(),
        }),
      );

      await expectProblem(response, status, apiCode);
      expect(subject.props.diceRoundService.play).not.toHaveBeenCalled();
    },
  );

  it("invalidates the current session, expires its cookie, and returns an empty 204", async () => {
    const subject = createSubject();

    const response = await subject.handlers.deleteCurrentSession(
      apiRequest("/api/v1/sessions/current", {
        method: "DELETE",
        headers: validMutationHeaders(),
      }),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("content-type")).toBeNull();
    expect(response.headers.get("set-cookie")).toContain(
      `${SESSION_POLICY.cookie.name}=`,
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(subject.props.authenticationService.logout).toHaveBeenCalledWith(
      SESSION_TOKEN,
    );
  });

  it("keeps repeated DELETE state-idempotent while rejecting the revoked credential", async () => {
    const defaults = createSubject().props.authenticationService;
    const authenticationService: CoreApiHandlerProps["authenticationService"] = {
      ...defaults,
      authorizeCookieMutation: vi
        .fn<CoreApiHandlerProps["authenticationService"]["authorizeCookieMutation"]>()
        .mockResolvedValueOnce({
          ok: true,
          principal: { accountId: "account-1", sessionId: "session-1" },
        })
        .mockResolvedValueOnce({
          ok: false,
          code: "AUTHENTICATION_REQUIRED",
        }),
    };
    const subject = createSubject({ authenticationService });
    const first = await subject.handlers.deleteCurrentSession(
      apiRequest("/api/v1/sessions/current", {
        method: "DELETE",
        headers: validMutationHeaders(),
      }),
    );
    const repeated = await subject.handlers.deleteCurrentSession(
      apiRequest("/api/v1/sessions/current", {
        method: "DELETE",
        headers: validMutationHeaders(),
      }),
    );

    expect(first.status).toBe(204);
    await expectProblem(repeated, 401, "AUTHENTICATION_REQUIRED");
    expect(authenticationService.logout).toHaveBeenCalledTimes(1);
  });

  it("rejects unsafe DELETE without invalidating a session", async () => {
    const defaults = createSubject().props.authenticationService;
    const authenticationService: CoreApiHandlerProps["authenticationService"] = {
      ...defaults,
      authorizeCookieMutation: vi.fn<
        CoreApiHandlerProps["authenticationService"]["authorizeCookieMutation"]
      >(() =>
        Promise.resolve({ ok: false, code: "UNSAFE_REQUEST" }),
      ),
    };
    const subject = createSubject({ authenticationService });

    const response = await subject.handlers.deleteCurrentSession(
      apiRequest("/api/v1/sessions/current", {
        method: "DELETE",
        headers: { host: "spieleabend.example" },
      }),
    );

    await expectProblem(response, 403, "FORBIDDEN");
    expect(authenticationService.logout).not.toHaveBeenCalled();
  });

  it("rejects unexpected DELETE body fields", async () => {
    const subject = createSubject();

    const response = await subject.handlers.deleteCurrentSession(
      apiRequest("/api/v1/sessions/current", {
        method: "DELETE",
        headers: validMutationHeaders(),
        body: { sessionId: "session-foreign" },
      }),
    );

    await expectProblem(response, 422, "INVALID_REQUEST");
    expect(subject.props.authenticationService.logout).not.toHaveBeenCalled();
  });

  it("returns a consistent 404 for unknown API resources", async () => {
    const subject = createSubject();

    const response = await subject.handlers.notFound(
      apiRequest("/api/v1/not-a-resource"),
      { params: Promise.resolve({ path: ["not-a-resource"] }) },
    );

    await expectProblem(response, 404, "RESOURCE_NOT_FOUND");
  });
});
