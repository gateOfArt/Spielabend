import { describe, expect, it, vi } from "vitest";
import { createRouletteActionHandler } from "@/app/roulette/action-handler";
import { initialRouletteActionState } from "@/domain/roulette";
import type { RateLimiter } from "@/server/rate-limit/rate-limiter";
import type {
  RouletteRoundResult,
  RouletteRoundService,
} from "@/server/services/roulette-round.contract";

function allowingRateLimiter(): Pick<RateLimiter, "consume"> {
  return { consume: () => ({ allowed: true }) };
}

const SESSION_TOKEN = "server-session-token";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";

const successfulRound: Extract<RouletteRoundResult, { ok: true }> = {
  ok: true,
  replayed: false,
  round: {
    requestId: REQUEST_ID,
    bet: 10,
    selection: "RED",
    result: 1,
    color: "RED",
    outcome: "win",
    netDelta: 10,
    finalCredits: 110,
  },
};

function rouletteFormData() {
  const formData = new FormData();
  formData.set("requestId", REQUEST_ID);
  formData.set("bet", "10");
  formData.set("selection", "RED");
  return formData;
}

function createService(result: RouletteRoundResult = successfulRound) {
  const play = vi.fn<RouletteRoundService["play"]>(() =>
    Promise.resolve(result),
  );

  return {
    service: { play } satisfies RouletteRoundService,
    play,
  };
}

describe("Roulette Server Action boundary", () => {
  it("validates, authorizes, delegates, revalidates, and returns only safe state", async () => {
    const { service, play } = createService();
    const authorizeRequest = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        principal: { accountId: "account-1", sessionId: "session-1" },
      }),
    );
    const revalidateRouletteViews = vi.fn();
    const action = createRouletteActionHandler({
      rouletteService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest,
      rateLimiter: allowingRateLimiter(),
      revalidateRouletteViews,
    });

    const state = await action(initialRouletteActionState, rouletteFormData());

    expect(authorizeRequest).toHaveBeenCalledWith(SESSION_TOKEN);
    expect(play).toHaveBeenCalledWith(SESSION_TOKEN, {
      requestId: REQUEST_ID,
      bet: 10,
      selection: "RED",
    });
    expect(revalidateRouletteViews).toHaveBeenCalledOnce();
    expect(state).toMatchObject({
      status: "success",
      replayed: false,
      round: successfulRound.round,
    });
    expect(JSON.stringify(state)).not.toContain(SESSION_TOKEN);
    expect(JSON.stringify(state)).not.toContain("accountId");
    expect(JSON.stringify(state)).not.toContain("transactionId");
  });

  it("rejects unexpected client authority fields before authorization", async () => {
    const { service, play } = createService();
    const authorizeRequest = vi.fn();
    const formData = rouletteFormData();
    formData.set("userId", "client-selected-user");
    formData.set("result", "1");
    const action = createRouletteActionHandler({
      rouletteService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest,
      rateLimiter: allowingRateLimiter(),
      revalidateRouletteViews: vi.fn(),
    });

    const state = await action(initialRouletteActionState, formData);

    expect(state.status).toBe("error");
    expect(authorizeRequest).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });

  it.each([
    { code: "UNSAFE_REQUEST" as const },
    { code: "AUTHENTICATION_REQUIRED" as const },
  ])("rejects $code before calling the game service", async ({ code }) => {
    const { service, play } = createService();
    const action = createRouletteActionHandler({
      rouletteService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest: () => Promise.resolve({ ok: false, code }),
      rateLimiter: allowingRateLimiter(),
      revalidateRouletteViews: vi.fn(),
    });

    const state = await action(initialRouletteActionState, rouletteFormData());

    expect(state.status).toBe("error");
    expect(play).not.toHaveBeenCalled();
  });

  it("maps insufficient credits without exposing internal details", async () => {
    const { service } = createService({
      ok: false,
      code: "INSUFFICIENT_CREDITS",
    });
    const action = createRouletteActionHandler({
      rouletteService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest: () =>
        Promise.resolve({
          ok: true,
          principal: { accountId: "account-1", sessionId: "session-1" },
        }),
      rateLimiter: allowingRateLimiter(),
      revalidateRouletteViews: vi.fn(),
    });

    const state = await action(initialRouletteActionState, rouletteFormData());

    expect(state).toEqual({
      status: "error",
      message: "Für diesen Einsatz reichen deine Credits nicht aus.",
      fieldErrors: {},
    });
  });

  it("blocks a round once the rate limit is exceeded without calling the game service", async () => {
    const { service, play } = createService();
    const consume = vi.fn(() => ({
      allowed: false as const,
      retryAfterSeconds: 5,
    }));
    const action = createRouletteActionHandler({
      rouletteService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest: () =>
        Promise.resolve({
          ok: true as const,
          principal: { accountId: "account-1", sessionId: "session-1" },
        }),
      rateLimiter: { consume },
      revalidateRouletteViews: vi.fn(),
    });

    const state = await action(
      initialRouletteActionState,
      rouletteFormData(),
    );

    expect(state.status).toBe("error");
    expect(consume).toHaveBeenCalledWith("game:account-1");
    expect(play).not.toHaveBeenCalled();
  });
});
