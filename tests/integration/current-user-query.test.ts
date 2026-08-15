import { describe, expect, it, vi } from "vitest";
import type { Account } from "@/domain/account";
import { AccountRepository } from "@/server/repositories/account-repository";
import {
  CurrentUserQueryService,
  type CurrentUserAccountReader,
  type CurrentUserAuthenticator,
} from "@/server/services/current-user-query";
import { InMemoryStore } from "@/server/store/in-memory-store";

const account: Account = {
  id: "account-1",
  displayName: "Ada",
  normalizedEmail: "ada@example.com",
  passwordHash: "$argon2id$secret-hash",
  credits: 125,
  createdAt: "2026-08-15T10:00:00.000Z",
};

function createSubject(accountRepository: CurrentUserAccountReader) {
  const authenticator: CurrentUserAuthenticator = {
    requireAuthenticatedAccount: vi.fn().mockResolvedValue({
      ok: true,
      principal: { accountId: account.id, sessionId: "session-1" },
    }),
  };

  return new CurrentUserQueryService({ authenticator, accountRepository });
}

describe("CurrentUserQueryService", () => {
  it("projects only the authenticated user's public fields", async () => {
    const accountRepository: CurrentUserAccountReader = {
      findById: vi.fn(() => account),
    };
    const service = createSubject(accountRepository);

    const result = await service.read("valid-session-token");

    expect(result).toEqual({
      ok: true,
      user: { displayName: "Ada", credits: 125 },
    });
    expect(JSON.stringify(result)).not.toContain("normalizedEmail");
    expect(JSON.stringify(result)).not.toContain("passwordHash");
    expect(JSON.stringify(result)).not.toContain("account-1");
  });

  it("fails closed when the account cannot be resolved", async () => {
    const service = createSubject(
      new AccountRepository(new InMemoryStore()),
    );

    await expect(service.read("valid-session-token")).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
  });
});
