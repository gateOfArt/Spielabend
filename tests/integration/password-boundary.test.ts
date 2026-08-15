import { describe, expect, it } from "vitest";
import { creditPolicy } from "@/domain/credits";
import { Argon2PasswordHasher } from "@/server/auth/password-hasher";
import { Sha256SessionTokenHasher } from "@/server/auth/session-crypto";
import { AccountRepository } from "@/server/repositories/account-repository";
import { SessionRepository } from "@/server/repositories/session-repository";
import { DefaultAccountRegistrationService } from "@/server/services/account-registration";
import { DefaultAuthenticationSessionService } from "@/server/services/authentication-session";
import { RuntimeUnitOfWork } from "@/server/services/runtime-unit-of-work";
import { InMemoryStore } from "@/server/store/in-memory-store";

describe("shared password boundary", () => {
  it("allows login with a 128-character Unicode password accepted at registration", async () => {
    const store = new InMemoryStore();
    const accountRepository = new AccountRepository(store);
    const passwordHasher = new Argon2PasswordHasher();
    let nextId = 0;
    const generateId = () => `generated-id-${++nextId}`;
    const now = () => new Date("2026-08-15T12:00:00.000Z");
    const registrationService = new DefaultAccountRegistrationService({
      accountRepository,
      passwordHasher,
      unitOfWork: new RuntimeUnitOfWork({
        store,
        creditPolicy,
        generateId,
        now,
      }),
    });
    const authenticationService = new DefaultAuthenticationSessionService({
      accountRepository,
      sessionRepository: new SessionRepository(store),
      passwordVerifier: passwordHasher,
      tokenGenerator: {
        generate: () => Buffer.alloc(32, 7).toString("base64url"),
      },
      tokenHasher: new Sha256SessionTokenHasher(),
      generateId,
      now,
      isProduction: false,
    });
    const password = "😀".repeat(128);

    const registration = await registrationService.register({
      displayName: "Unicode Spielerin",
      email: "unicode@example.com",
      password,
    });
    const login = await authenticationService.login({
      email: "unicode@example.com",
      password,
    });

    expect(registration.ok).toBe(true);
    expect(login.ok).toBe(true);
    expect(store.listSessions()).toHaveLength(1);
  });
});
