import "server-only";

import { z } from "zod";
import { Argon2PasswordHasher } from "@/server/auth/password-hasher";
import {
  PASSWORD_LENGTH_POLICY,
  passwordCharacterLength,
} from "@/server/auth/password-policy";
import { AccountRepository } from "@/server/repositories/account-repository";
import { inMemoryStore } from "@/server/store/in-memory-store";
import type {
  AccountRegistrationResult,
  AccountRegistrationService,
  RegistrationField,
} from "@/server/services/account-registration.contract";
import type { PasswordHasher } from "@/server/auth/password-hasher";
import {
  DuplicateNormalizedEmailError,
  runtimeUnitOfWork,
  type RuntimeUnitOfWork,
} from "@/server/services/runtime-unit-of-work";

const displayNameSchema = z
  .string()
  .transform((value) => value.trim().normalize("NFC"))
  .refine((value) => Array.from(value).length >= 2, {
    error: "Der Anzeigename muss mindestens 2 Zeichen lang sein.",
  })
  .refine((value) => Array.from(value).length <= 40, {
    error: "Der Anzeigename darf höchstens 40 Zeichen lang sein.",
  })
  .refine((value) => !/\p{Cc}/u.test(value), {
    error: "Der Anzeigename enthält ungültige Steuerzeichen.",
  });

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email({ error: "Bitte gib eine gültige E-Mail-Adresse ein." })
      .max(254, { error: "Die E-Mail-Adresse ist zu lang." }),
  );

const passwordSchema = z
  .string()
  .refine(
    (value) =>
      passwordCharacterLength(value) >= PASSWORD_LENGTH_POLICY.minimum,
    {
      error: `Das Passwort muss mindestens ${PASSWORD_LENGTH_POLICY.minimum} Zeichen lang sein.`,
    },
  )
  .refine(
    (value) =>
      passwordCharacterLength(value) <= PASSWORD_LENGTH_POLICY.maximum,
    {
      error: `Das Passwort darf höchstens ${PASSWORD_LENGTH_POLICY.maximum} Zeichen lang sein.`,
    },
  );

export const registrationInputSchema = z.strictObject({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type ValidatedRegistrationInput = z.infer<
  typeof registrationInputSchema
>;

export type RegistrationValidationResult =
  | { success: true; data: ValidatedRegistrationInput }
  | {
      success: false;
      fieldErrors: Partial<Record<RegistrationField, readonly string[]>>;
    };

export interface AccountRegistrationServiceProps {
  accountRepository: AccountRepository;
  passwordHasher: PasswordHasher;
  unitOfWork: RuntimeUnitOfWork;
}

function mapFieldErrors(
  error: z.ZodError,
): Partial<Record<RegistrationField, readonly string[]>> {
  const fieldErrors: Partial<Record<RegistrationField, readonly string[]>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      field !== "displayName" &&
      field !== "email" &&
      field !== "password"
    ) {
      continue;
    }

    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return fieldErrors;
}

export function validateRegistrationInput(
  input: unknown,
): RegistrationValidationResult {
  const result = registrationInputSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: mapFieldErrors(result.error),
    };
  }

  return { success: true, data: result.data };
}

export class DefaultAccountRegistrationService
  implements AccountRegistrationService
{
  private readonly accountRepository: AccountRepository;
  private readonly passwordHasher: PasswordHasher;
  private readonly unitOfWork: RuntimeUnitOfWork;

  constructor({
    accountRepository,
    passwordHasher,
    unitOfWork,
  }: AccountRegistrationServiceProps) {
    this.accountRepository = accountRepository;
    this.passwordHasher = passwordHasher;
    this.unitOfWork = unitOfWork;
  }

  async register(input: unknown): Promise<AccountRegistrationResult> {
    const validation = validateRegistrationInput(input);

    if (!validation.success) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: validation.fieldErrors,
      };
    }

    try {
      const passwordHash = await this.passwordHasher.hash(
        validation.data.password,
      );

      if (
        this.accountRepository.findByNormalizedEmail(validation.data.email)
      ) {
        return { ok: false, code: "ACCOUNT_UNAVAILABLE" };
      }

      const account = this.unitOfWork.createAccountWithStartingCredit({
        displayName: validation.data.displayName,
        normalizedEmail: validation.data.email,
        passwordHash,
      });

      return {
        ok: true,
        account: {
          displayName: account.displayName,
          credits: account.credits,
        },
      };
    } catch (error) {
      if (error instanceof DuplicateNormalizedEmailError) {
        return { ok: false, code: "ACCOUNT_UNAVAILABLE" };
      }

      return { ok: false, code: "REGISTRATION_FAILED" };
    }
  }
}

const productionAccountRepository = new AccountRepository(inMemoryStore);
export const accountRegistrationService =
  new DefaultAccountRegistrationService({
    accountRepository: productionAccountRepository,
    passwordHasher: new Argon2PasswordHasher(),
    unitOfWork: runtimeUnitOfWork,
  });
