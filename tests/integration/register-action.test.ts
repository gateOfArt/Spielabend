import { describe, expect, it, vi } from "vitest";
import { createRegistrationActionHandler } from "@/app/register/action-handler";
import { creditPolicy } from "@/domain/credits";
import { initialRegistrationActionState } from "@/domain/registration";
import { AccountRepository } from "@/server/repositories/account-repository";
import { CreditTransactionRepository } from "@/server/repositories/credit-transaction-repository";
import type { RateLimiter } from "@/server/rate-limit/rate-limiter";
import { DefaultAccountRegistrationService } from "@/server/services/account-registration";
import { RuntimeUnitOfWork } from "@/server/services/runtime-unit-of-work";
import { InMemoryStore } from "@/server/store/in-memory-store";

function allowingRateLimiter(): Pick<RateLimiter, "consume"> {
  return { consume: () => ({ allowed: true }) };
}

function createSubject({
  isRequestOriginAllowed = () => true,
  rateLimiter = allowingRateLimiter(),
}: {
  readonly isRequestOriginAllowed?: () => boolean;
  readonly rateLimiter?: Pick<RateLimiter, "consume">;
} = {}) {
  const store = new InMemoryStore();
  const accountRepository = new AccountRepository(store);
  const transactionRepository = new CreditTransactionRepository(store);
  const hash = vi.fn(() => Promise.resolve("$test$encoded-password-hash"));
  let nextId = 0;
  const unitOfWork = new RuntimeUnitOfWork({
    store,
    creditPolicy,
    generateId: () => `action-test-id-${(nextId += 1)}`,
    now: () => new Date("2026-08-14T04:00:00.000Z"),
  });
  const service = new DefaultAccountRegistrationService({
    accountRepository,
    passwordHasher: { hash },
    unitOfWork,
  });

  return {
    action: createRegistrationActionHandler({
      accountRegistrationService: service,
      isRequestOriginAllowed,
      rateLimiter,
      resolveClientKey: () => "test-client",
    }),
    accountRepository,
    transactionRepository,
    hash,
  };
}

function registrationFormData(
  values: Partial<Record<"displayName" | "email" | "password", string>> = {},
) {
  const formData = new FormData();
  formData.set("displayName", values.displayName ?? "Ada Spielerin");
  formData.set("email", values.email ?? "ada.action@example.com");
  formData.set(
    "password",
    values.password ?? "correct horse battery staple",
  );
  return formData;
}

describe("registration action boundary", () => {
  it("returns field errors before hashing or writing invalid input", async () => {
    const subject = createSubject();
    const formData = registrationFormData({ email: "not-an-email" });

    const state = await subject.action(
      initialRegistrationActionState,
      formData,
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors.email).toContain(
      "Bitte gib eine gültige E-Mail-Adresse ein.",
    );
    expect(subject.hash).not.toHaveBeenCalled();
    expect(subject.accountRepository.listAll()).toHaveLength(0);
    expect(subject.transactionRepository.listAll()).toHaveLength(0);
  });

  it("rejects extra client authority fields before hashing or writing", async () => {
    const subject = createSubject();
    const formData = registrationFormData();
    formData.set("id", "client-selected-id");
    formData.set("credits", "1000000");
    formData.set("transactionDelta", "1000000");
    formData.set("transactionReason", "ADMIN_GRANT");

    const state = await subject.action(
      initialRegistrationActionState,
      formData,
    );

    expect(state).toMatchObject({
      status: "error",
      message: "Bitte prüfe deine Eingaben.",
    });
    expect(subject.hash).not.toHaveBeenCalled();
    expect(subject.accountRepository.listAll()).toHaveLength(0);
    expect(subject.transactionRepository.listAll()).toHaveLength(0);
  });

  it("creates one account and returns the same safe error for a normalized duplicate", async () => {
    const subject = createSubject();

    const firstState = await subject.action(
      initialRegistrationActionState,
      registrationFormData(),
    );
    const duplicateState = await subject.action(
      initialRegistrationActionState,
      registrationFormData({
        displayName: "Grace Spielerin",
        email: "  ADA.ACTION@EXAMPLE.COM  ",
      }),
    );

    expect(firstState).toEqual({
      status: "success",
      fieldErrors: {},
      message: "Konto erstellt. Dein Startguthaben beträgt 100 Credits.",
    });
    expect(JSON.stringify(firstState)).not.toContain("password");
    expect(duplicateState).toEqual({
      status: "error",
      fieldErrors: {},
      message:
        "Das Konto konnte nicht erstellt werden. Bitte versuche es erneut.",
    });
    expect(subject.accountRepository.listAll()).toHaveLength(1);
    expect(subject.transactionRepository.listAll()).toHaveLength(1);
  });

  it("rejects an unsafe request origin before hashing or writing", async () => {
    const subject = createSubject({ isRequestOriginAllowed: () => false });

    const state = await subject.action(
      initialRegistrationActionState,
      registrationFormData(),
    );

    expect(state).toEqual({
      status: "error",
      fieldErrors: {},
      message:
        "Das Konto konnte nicht erstellt werden. Bitte versuche es erneut.",
    });
    expect(subject.hash).not.toHaveBeenCalled();
    expect(subject.accountRepository.listAll()).toHaveLength(0);
  });

  it("blocks a registration attempt once the rate limit is exceeded without hashing or writing", async () => {
    const consume = vi.fn(() => ({
      allowed: false as const,
      retryAfterSeconds: 17,
    }));
    const subject = createSubject({ rateLimiter: { consume } });

    const state = await subject.action(
      initialRegistrationActionState,
      registrationFormData(),
    );

    expect(state).toEqual({
      status: "error",
      fieldErrors: {},
      message:
        "Zu viele Registrierungsversuche. Bitte versuche es in Kürze erneut.",
    });
    expect(consume).toHaveBeenCalledWith(
      "register:test-client:ada.action@example.com",
    );
    expect(subject.hash).not.toHaveBeenCalled();
    expect(subject.accountRepository.listAll()).toHaveLength(0);
  });
});
