import "server-only";

import type { RegistrationFieldErrors } from "@/domain/registration";

export type { RegistrationField } from "@/domain/registration";

export type RegistrationErrorCode =
  | "INVALID_INPUT"
  | "ACCOUNT_UNAVAILABLE"
  | "REGISTRATION_FAILED";

export type AccountRegistrationResult =
  | {
      ok: true;
      account: {
        displayName: string;
        credits: number;
      };
    }
  | {
      ok: false;
      code: RegistrationErrorCode;
      fieldErrors?: RegistrationFieldErrors;
    };

export interface AccountRegistrationService {
  register(input: unknown): Promise<AccountRegistrationResult>;
}
