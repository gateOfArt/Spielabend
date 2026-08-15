import { describe, expect, it, vi } from "vitest";
import type { GameRound } from "@/domain/dice";
import {
  GameRoundQueryService,
  type GameRoundAccountReader,
  type GameRoundAuthenticator,
  type GameRoundQueryResult,
} from "@/server/services/game-round-query";

const ownRound: GameRound = {
  id: "round-own",
  accountId: "account-current",
  transactionId: "transaction-own",
  requestId: "b9c32417-0e18-4bb4-bfa7-a50d0981fcbb",
  game: "DICE",
  bet: 10,
  prediction: 4,
  result: 4,
  outcome: "win",
  netDelta: 50,
  finalCredits: 150,
  createdAt: "2026-08-15T10:00:00.000Z",
};

const foreignRound: GameRound = {
  ...ownRound,
  id: "round-foreign",
  accountId: "account-foreign",
  transactionId: "transaction-foreign",
  requestId: "08fb8ac3-ae85-4bfa-83e0-c30ae26bd66e",
};

function expectSuccess(
  result: GameRoundQueryResult,
): asserts result is Extract<GameRoundQueryResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

describe("GameRoundQueryService", () => {
  it("filters by the authenticated owner and projects a safe round DTO", async () => {
    const authenticator: GameRoundAuthenticator = {
      requireAuthenticatedAccount: vi.fn().mockResolvedValue({
        ok: true,
        principal: {
          accountId: "account-current",
          sessionId: "session-current",
        },
      }),
    };
    const roundReader: GameRoundAccountReader = {
      listByAccountId: vi.fn(() => [foreignRound, ownRound]),
    };
    const service = new GameRoundQueryService({ authenticator, roundReader });

    const result = await service.read("valid-session-token");

    expectSuccess(result);
    expect(roundReader.listByAccountId).toHaveBeenCalledWith("account-current");
    expect(result.rounds).toEqual([
      {
        game: "DICE",
        requestId: ownRound.requestId,
        bet: 10,
        prediction: 4,
        result: 4,
        outcome: "win",
        netDelta: 50,
        finalCredits: 150,
        createdAt: ownRound.createdAt,
      },
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("account-current");
    expect(serialized).not.toContain("account-foreign");
    expect(serialized).not.toContain("transaction-own");
    expect(serialized).not.toContain("round-own");
  });

  it("rejects an unauthenticated read without touching persistence", async () => {
    const authenticator: GameRoundAuthenticator = {
      requireAuthenticatedAccount: vi.fn().mockResolvedValue({
        ok: false,
        code: "AUTHENTICATION_REQUIRED",
      }),
    };
    const roundReader: GameRoundAccountReader = {
      listByAccountId: vi.fn(),
    };
    const service = new GameRoundQueryService({ authenticator, roundReader });

    await expect(service.read(null)).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(roundReader.listByAccountId).not.toHaveBeenCalled();
  });
});
