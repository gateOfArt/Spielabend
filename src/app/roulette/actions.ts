"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { createRouletteActionHandler } from "@/app/roulette/action-handler";
import type { RouletteActionState } from "@/domain/roulette";
import { SESSION_POLICY } from "@/server/auth/authentication.contract";
import { createMutationRequestEvidence } from "@/server/auth/request-security";
import { gameActionRateLimiter } from "@/server/rate-limit/policies";
import { authenticationSessionService } from "@/server/services/authentication-session";
import { rouletteRoundService } from "@/server/services/roulette-round";

const rouletteActionHandler = createRouletteActionHandler({
  rouletteService: rouletteRoundService,
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
  rateLimiter: gameActionRateLimiter,
  revalidateRouletteViews() {
    revalidatePath("/roulette");
    revalidatePath("/lobby");
  },
});

export async function playRouletteAction(
  previousState: RouletteActionState,
  formData: FormData,
): Promise<RouletteActionState> {
  return rouletteActionHandler(previousState, formData);
}
