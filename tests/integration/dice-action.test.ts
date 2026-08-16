import { describe, expect, it, vi } from "vitest";
import { createDiceActionHandler } from "@/app/dice/action-handler";
import { initialDiceActionState } from "@/domain/dice";
import type { RateLimiter } from "@/server/rate-limit/rate-limiter";
import type {
  DiceRoundResult,
  DiceRoundService,
} from "@/server/services/dice-round.contract";

function allowingRateLimiter(): Pick<RateLimiter, "consume"> {
  return { consume: () => ({ allowed: true }) };
}

const SESSION_TOKEN = "server-session-token";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";

const successfulRound: Extract<DiceRoundResult, { ok: true }> = {
  ok: true,
  replayed: false,
  round: {
    requestId: REQUEST_ID,
    bet: 10,
    prediction: 4,
    result: 4,
    outcome: "win",
    netDelta: 50,
    finalCredits: 150,
  },
};

function diceFormData() {
  const formData = new FormData();
  formData.set("requestId", REQUEST_ID);
  formData.set("bet", "10");
  formData.set("prediction", "4");
  return formData;
}

function createService(result: DiceRoundResult = successfulRound) {
  const play = vi.fn<DiceRoundService["play"]>(() =>
    Promise.resolve(result),
  );

  return {
    service: { play } satisfies DiceRoundService,
    play,
  };
}

describe("Dice Server Action boundary", () => {
  it("validates, authorizes, delegates, revalidates, and returns only safe state", async () => {
    const { service, play } = createService();
    const authorizeRequest = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        principal: { accountId: "account-1", sessionId: "session-1" },
      }),
    );
    const revalidateDiceViews = vi.fn();
    const action = createDiceActionHandler({
      diceService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest,
      rateLimiter: allowingRateLimiter(),
      revalidateDiceViews,
    });

    const state = await action(initialDiceActionState, diceFormData());

    expect(authorizeRequest).toHaveBeenCalledWith(SESSION_TOKEN);
    expect(play).toHaveBeenCalledWith(SESSION_TOKEN, {
      requestId: REQUEST_ID,
      bet: 10,
      prediction: 4,
    });
    expect(revalidateDiceViews).toHaveBeenCalledOnce();
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
    const formData = diceFormData();
    formData.set("userId", "client-selected-user");
    formData.set("result", "4");
    const action = createDiceActionHandler({
      diceService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest,
      rateLimiter: allowingRateLimiter(),
      revalidateDiceViews: vi.fn(),
    });

    const state = await action(initialDiceActionState, formData);

    expect(state.status).toBe("error");
    expect(authorizeRequest).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });

  it.each([
    { code: "UNSAFE_REQUEST" as const },
    { code: "AUTHENTICATION_REQUIRED" as const },
  ])("rejects $code before calling the game service", async ({ code }) => {
    const { service, play } = createService();
    const action = createDiceActionHandler({
      diceService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest: () => Promise.resolve({ ok: false, code }),
      rateLimiter: allowingRateLimiter(),
      revalidateDiceViews: vi.fn(),
    });

    const state = await action(initialDiceActionState, diceFormData());

    expect(state.status).toBe("error");
    expect(play).not.toHaveBeenCalled();
  });

  it("maps insufficient credits without exposing internal details", async () => {
    const { service } = createService({
      ok: false,
      code: "INSUFFICIENT_CREDITS",
    });
    const action = createDiceActionHandler({
      diceService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest: () =>
        Promise.resolve({
          ok: true,
          principal: { accountId: "account-1", sessionId: "session-1" },
        }),
      rateLimiter: allowingRateLimiter(),
      revalidateDiceViews: vi.fn(),
    });

    const state = await action(initialDiceActionState, diceFormData());

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
    const action = createDiceActionHandler({
      diceService: service,
      getSessionToken: () => SESSION_TOKEN,
      authorizeRequest: () =>
        Promise.resolve({
          ok: true as const,
          principal: { accountId: "account-1", sessionId: "session-1" },
        }),
      rateLimiter: { consume },
      revalidateDiceViews: vi.fn(),
    });

    const state = await action(initialDiceActionState, diceFormData());

    expect(state.status).toBe("error");
    expect(consume).toHaveBeenCalledWith("game:account-1");
    expect(play).not.toHaveBeenCalled();
  });
});
