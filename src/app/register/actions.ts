"use server";

import "server-only";

import { headers } from "next/headers";
import type { RegistrationActionState } from "@/domain/registration";
import { createRegistrationActionHandler } from "@/app/register/action-handler";
import {
  createMutationRequestEvidence,
  resolveClientIpLikeKey,
} from "@/server/auth/request-security";
import { registrationRateLimiter } from "@/server/rate-limit/policies";
import { accountRegistrationService } from "@/server/services/account-registration";
import { isSameOriginMutationEvidence } from "@/server/services/authentication-session";

const registrationActionHandler = createRegistrationActionHandler({
  accountRegistrationService,
  async isRequestOriginAllowed() {
    return isSameOriginMutationEvidence(
      createMutationRequestEvidence(await headers(), "POST"),
    );
  },
  rateLimiter: registrationRateLimiter,
  async resolveClientKey() {
    return resolveClientIpLikeKey(await headers());
  },
});

export async function registerAccountAction(
  previousState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  return registrationActionHandler(previousState, formData);
}
