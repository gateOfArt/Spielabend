import { describe, expect, it, vi } from "vitest";
import type { Account } from "@/domain/account";
import {
  LeaderboardQueryService,
  type LeaderboardAccountReader,
  type LeaderboardAuthenticator,
  type LeaderboardQueryResult,
} from "@/server/services/leaderboard-query";

const accounts: readonly Account[] = [
  {
    id: "account-3",
    displayName: "Zora",
    normalizedEmail: "zora@example.com",
    passwordHash: "$argon2id$zora-secret-hash",
    credits: 90,
    createdAt: "2026-08-15T08:03:00.000Z",
  },
  {
    id: "account-2",
    displayName: "Bruno",
    normalizedEmail: "bruno@example.com",
    passwordHash: "$argon2id$bruno-secret-hash",
    credits: 150,
    createdAt: "2026-08-15T08:02:00.000Z",
  },
  {
    id: "account-1",
    displayName: "Ada",
    normalizedEmail: "ada@example.com",
    passwordHash: "$argon2id$ada-secret-hash",
    credits: 150,
    createdAt: "2026-08-15T08:01:00.000Z",
  },
];

function expectSuccess(
  result: LeaderboardQueryResult,
): asserts result is Extract<LeaderboardQueryResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

function createAuthenticatedSubject(accountId = "account-2") {
  const authenticator: LeaderboardAuthenticator = {
    requireAuthenticatedAccount: vi.fn().mockResolvedValue({
      ok: true,
      principal: { accountId, sessionId: "session-1" },
    }),
  };
  const accountReader: LeaderboardAccountReader = {
    findById: vi.fn(
      (requestedId: string) =>
        accounts.find((account) => account.id === requestedId) ?? null,
    ),
    listAll: vi.fn(() => accounts),
  };

  return {
    accountReader,
    authenticator,
    service: new LeaderboardQueryService({ authenticator, accountReader }),
  };
}

describe("LeaderboardQueryService", () => {
  it("sorts credits descending, shares ranks for ties, and orders ties deterministically", async () => {
    const subject = createAuthenticatedSubject();

    const result = await subject.service.read("valid-session-token");

    expectSuccess(result);
    expect(result.entries).toEqual([
      { rank: 1, displayName: "Ada", credits: 150, isCurrentUser: false },
      { rank: 1, displayName: "Bruno", credits: 150, isCurrentUser: true },
      { rank: 3, displayName: "Zora", credits: 90, isCurrentUser: false },
    ]);
  });

  it("returns only safe public fields and the current user's public summary", async () => {
    const subject = createAuthenticatedSubject();

    const result = await subject.service.read("valid-session-token");

    expectSuccess(result);
    expect(result.currentUser).toEqual({ displayName: "Bruno", credits: 150 });
    expect(Object.keys(result.entries[0] ?? {}).sort()).toEqual([
      "credits",
      "displayName",
      "isCurrentUser",
      "rank",
    ]);
    const serializedResult = JSON.stringify(result);
    expect(serializedResult).not.toContain("normalizedEmail");
    expect(serializedResult).not.toContain("passwordHash");
    expect(serializedResult).not.toContain("account-2");
    expect(serializedResult).not.toContain("bruno@example.com");
    expect(serializedResult).not.toContain("bruno-secret-hash");
  });

  it("rejects an unauthenticated read without loading accounts", async () => {
    const authenticator: LeaderboardAuthenticator = {
      requireAuthenticatedAccount: vi.fn().mockResolvedValue({
        ok: false,
        code: "AUTHENTICATION_REQUIRED",
      }),
    };
    const accountReader: LeaderboardAccountReader = {
      findById: vi.fn(),
      listAll: vi.fn(),
    };
    const service = new LeaderboardQueryService({
      authenticator,
      accountReader,
    });

    await expect(service.read(null)).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(accountReader.findById).not.toHaveBeenCalled();
    expect(accountReader.listAll).not.toHaveBeenCalled();
  });

  it("fails closed when the authenticated account no longer exists", async () => {
    const subject = createAuthenticatedSubject("missing-account");

    await expect(subject.service.read("valid-session-token")).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(subject.accountReader.listAll).not.toHaveBeenCalled();
  });
});
