import "server-only";

import { STARTING_CREDITS } from "@/domain/credits";
import type {
  RegistrationAction,
  RegistrationActionState,
} from "@/domain/registration";
import {
  validateRegistrationInput,
} from "@/server/services/account-registration";
import type { AccountRegistrationService } from "@/server/services/account-registration.contract";

const INVALID_INPUT_MESSAGE = "Bitte prüfe deine Eingaben.";
const SAFE_REGISTRATION_ERROR =
  "Das Konto konnte nicht erstellt werden. Bitte versuche es erneut.";

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

export function createRegistrationActionHandler(
  accountRegistrationService: AccountRegistrationService,
): RegistrationAction {
  return async function registrationAction(
    previousState,
    formData,
  ): Promise<RegistrationActionState> {
    void previousState;

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
