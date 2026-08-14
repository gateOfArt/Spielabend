"use server";

import "server-only";

import type { RegistrationActionState } from "@/domain/registration";
import { createRegistrationActionHandler } from "@/app/register/action-handler";
import { accountRegistrationService } from "@/server/services/account-registration";

const registrationActionHandler = createRegistrationActionHandler(
  accountRegistrationService,
);

export async function registerAccountAction(
  previousState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  return registrationActionHandler(previousState, formData);
}
