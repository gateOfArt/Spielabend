"use server";

import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createLoginActionHandler } from "@/app/login/action-handler";
import type { LoginActionState } from "@/domain/authentication";
import {
  createMutationRequestEvidence,
  resolveClientIpLikeKey,
} from "@/server/auth/request-security";
import { loginRateLimiter } from "@/server/rate-limit/policies";
import {
  authenticationSessionService,
  isSameOriginMutationEvidence,
} from "@/server/services/authentication-session";

const loginActionHandler = createLoginActionHandler({
  authenticationService: authenticationSessionService,
  async isRequestOriginAllowed() {
    return isSameOriginMutationEvidence(
      createMutationRequestEvidence(await headers(), "POST"),
    );
  },
  rateLimiter: loginRateLimiter,
  async resolveClientKey() {
    return resolveClientIpLikeKey(await headers());
  },
  async setSessionCookie(cookie) {
    (await cookies()).set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      path: cookie.path,
      expires: new Date(cookie.expires),
    });
  },
});

export async function loginAction(
  previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const state = await loginActionHandler(previousState, formData);

  if (state.status === "success") {
    redirect("/lobby");
  }

  return state;
}
