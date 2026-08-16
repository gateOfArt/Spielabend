import "server-only";

import { STARTING_CREDITS } from "@/domain/credits";
import type {
  RegistrationAction,
  RegistrationActionState,
} from "@/domain/registration";
import type { RateLimiter } from "@/server/rate-limit/rate-limiter";
import {
  validateRegistrationInput,
} from "@/server/services/account-registration";
import type { AccountRegistrationService } from "@/server/services/account-registration.contract";

const INVALID_INPUT_MESSAGE = "Bitte prüfe deine Eingaben.";
const SAFE_REGISTRATION_ERROR =
  "Das Konto konnte nicht erstellt werden. Bitte versuche es erneut.";
const RATE_LIMITED_MESSAGE =
  "Zu viele Registrierungsversuche. Bitte versuche es in Kürze erneut.";

function formDataToUntrustedInput(formData: FormData): Record<string, unknown> {
  const input: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION_")) {
      continue;
    }

    const currentValue = input[key];
    input[key] =
      currentValue === undefined
        ? value
        : Array.isArray(currentValue)
          ? [...currentValue, value]
          : [currentValue, value];
  }

  return input;
}

export interface RegistrationActionHandlerProps {
  readonly accountRegistrationService: AccountRegistrationService;
  readonly isRequestOriginAllowed: () => boolean | Promise<boolean>;
  readonly rateLimiter: Pick<RateLimiter, "consume">;
  readonly resolveClientKey: () => string | Promise<string>;
}

export function createRegistrationActionHandler({
  accountRegistrationService,
  isRequestOriginAllowed,
  rateLimiter,
  resolveClientKey,
}: RegistrationActionHandlerProps): RegistrationAction {
  return async function registrationAction(
    previousState,
    formData,
  ): Promise<RegistrationActionState> {
    void previousState;

    if (!(await isRequestOriginAllowed())) {
      return {
        status: "error",
        fieldErrors: {},
        message: SAFE_REGISTRATION_ERROR,
      };
    }

    const validation = validateRegistrationInput(
      formDataToUntrustedInput(formData),
    );

    if (!validation.success) {
      return {
        status: "error",
        fieldErrors: validation.fieldErrors,
        message: INVALID_INPUT_MESSAGE,
      };
    }

    const clientKey = await resolveClientKey();
    const rateLimit = rateLimiter.consume(
      `register:${clientKey}:${validation.data.email}`,
    );

    if (!rateLimit.allowed) {
      return {
        status: "error",
        fieldErrors: {},
        message: RATE_LIMITED_MESSAGE,
      };
    }

    const result = await accountRegistrationService.register(validation.data);

    if (result.ok) {
      return {
        status: "success",
        fieldErrors: {},
        message: `Konto erstellt. Dein Startguthaben beträgt ${STARTING_CREDITS} Credits.`,
      };
    }

    if (result.code === "INVALID_INPUT") {
      return {
        status: "error",
        fieldErrors: result.fieldErrors ?? {},
        message: INVALID_INPUT_MESSAGE,
      };
    }

    return {
      status: "error",
      fieldErrors: {},
      message: SAFE_REGISTRATION_ERROR,
    };
  };
}
