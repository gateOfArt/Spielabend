"use server";

import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createLogoutActionHandler } from "@/app/logout/action-handler";
import type { LogoutActionState } from "@/domain/authentication";
import { SESSION_POLICY } from "@/server/auth/authentication.contract";
import { createMutationRequestEvidence } from "@/server/auth/request-security";
import { authenticationSessionService } from "@/server/services/authentication-session";

const logoutActionHandler = createLogoutActionHandler({
  authenticationService: authenticationSessionService,
  async getSessionToken() {
    return (
      (await cookies()).get(SESSION_POLICY.cookie.name)?.value ?? null
    );
  },
  async authorizeRequest(sessionToken) {
    return authenticationSessionService.authorizeCookieMutation({
      ...createMutationRequestEvidence(await headers(), "POST"),
      sessionToken,
    });
  },
  async setExpiredSessionCookie(cookie) {
    (await cookies()).set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      path: cookie.path,
      expires: new Date(cookie.expires),
      maxAge: cookie.maxAge,
    });
  },
});

export async function logoutAction(
  previousState: LogoutActionState,
  formData: FormData,
): Promise<LogoutActionState> {
  const state = await logoutActionHandler(previousState, formData);

  if (state.status === "success") {
    redirect("/login");
  }

  return state;
}
