"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { createDiceActionHandler } from "@/app/dice/action-handler";
import type { DiceActionState } from "@/domain/dice";
import { SESSION_POLICY } from "@/server/auth/authentication.contract";
import { createMutationRequestEvidence } from "@/server/auth/request-security";
import { gameActionRateLimiter } from "@/server/rate-limit/policies";
import { authenticationSessionService } from "@/server/services/authentication-session";
import { diceRoundService } from "@/server/services/dice-round";

const diceActionHandler = createDiceActionHandler({
  diceService: diceRoundService,
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
  revalidateDiceViews() {
    revalidatePath("/dice");
    revalidatePath("/lobby");
  },
});

export async function playDiceAction(
  previousState: DiceActionState,
  formData: FormData,
): Promise<DiceActionState> {
  return diceActionHandler(previousState, formData);
}
