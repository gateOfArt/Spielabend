export type RegistrationField = "displayName" | "email" | "password";

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
      fieldErrors?: Partial<Record<RegistrationField, readonly string[]>>;
    };

/**
 * Contract-only seam for PROMPT 05A RED tests.
 *
 * The unknown input keeps the external boundary explicit. PROMPT 05B will add
 * parsing and production behavior behind this interface.
 */
export interface AccountRegistrationService {
  register(input: unknown): Promise<AccountRegistrationResult>;
}
