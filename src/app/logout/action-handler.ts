import "server-only";

import type {
  LogoutAction,
  LogoutActionState,
} from "@/domain/authentication";
import type {
  AuthenticationSessionService,
  CookieMutationAuthorizationResult,
  ExpiredSessionCookie,
} from "@/server/auth/authentication.contract";

const SAFE_LOGOUT_ERROR =
  "Die Abmeldung konnte nicht durchgeführt werden. Bitte versuche es erneut.";

export interface LogoutActionHandlerProps {
  readonly authenticationService: AuthenticationSessionService;
  readonly getSessionToken: () => string | null | Promise<string | null>;
  readonly authorizeRequest: (
    sessionToken: string | null,
  ) =>
    | CookieMutationAuthorizationResult
    | Promise<CookieMutationAuthorizationResult>;
  readonly setExpiredSessionCookie: (
    cookie: ExpiredSessionCookie,
  ) => void | Promise<void>;
}

function containsUnexpectedFormFields(formData: FormData): boolean {
  return Array.from(formData.keys()).some(
    (key) => !key.startsWith("$ACTION_"),
  );
}

export function createLogoutActionHandler({
  authenticationService,
  getSessionToken,
  authorizeRequest,
  setExpiredSessionCookie,
}: LogoutActionHandlerProps): LogoutAction {
  return async function logoutAction(
    previousState,
    formData,
  ): Promise<LogoutActionState> {
    void previousState;

    if (containsUnexpectedFormFields(formData)) {
      return { status: "error", message: SAFE_LOGOUT_ERROR };
    }

    const sessionToken = await getSessionToken();
    const authorization = await authorizeRequest(sessionToken);

    if (!authorization.ok && authorization.code === "UNSAFE_REQUEST") {
      return { status: "error", message: SAFE_LOGOUT_ERROR };
    }

    const result = await authenticationService.logout(sessionToken);

    if (!result.ok) {
      return { status: "error", message: SAFE_LOGOUT_ERROR };
    }

    await setExpiredSessionCookie(result.cookie);

    return { status: "success" };
  };
}
