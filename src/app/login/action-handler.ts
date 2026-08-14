import "server-only";

import type {
  LoginAction,
  LoginActionState,
} from "@/domain/authentication";
import type {
  AuthenticationSessionService,
  SessionCookie,
} from "@/server/auth/authentication.contract";
import { validateLoginCredentials } from "@/server/services/authentication-session";

const INVALID_CREDENTIALS_MESSAGE =
  "E-Mail-Adresse oder Passwort ist ungültig.";
const SAFE_LOGIN_ERROR =
  "Die Anmeldung konnte nicht durchgeführt werden. Bitte versuche es erneut.";

export interface LoginActionHandlerProps {
  readonly authenticationService: AuthenticationSessionService;
  readonly isRequestOriginAllowed: () => boolean | Promise<boolean>;
  readonly setSessionCookie: (
    cookie: SessionCookie,
  ) => void | Promise<void>;
}

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

export function createLoginActionHandler({
  authenticationService,
  isRequestOriginAllowed,
  setSessionCookie,
}: LoginActionHandlerProps): LoginAction {
  return async function loginAction(
    previousState,
    formData,
  ): Promise<LoginActionState> {
    void previousState;

    if (!(await isRequestOriginAllowed())) {
      return { status: "error", message: SAFE_LOGIN_ERROR };
    }

    const validation = validateLoginCredentials(
      formDataToUntrustedInput(formData),
    );

    if (!validation.success) {
      return { status: "error", message: INVALID_CREDENTIALS_MESSAGE };
    }

    const result = await authenticationService.login(validation.data);

    if (!result.ok) {
      return {
        status: "error",
        message:
          result.code === "INVALID_CREDENTIALS"
            ? INVALID_CREDENTIALS_MESSAGE
            : SAFE_LOGIN_ERROR,
      };
    }

    await setSessionCookie(result.cookie);

    return { status: "success" };
  };
}
