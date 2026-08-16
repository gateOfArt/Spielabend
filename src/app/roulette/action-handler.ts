import "server-only";

import type { RouletteAction, RouletteActionState } from "@/domain/roulette";
import type {
  CookieMutationAuthorizationResult,
} from "@/server/auth/authentication.contract";
import type { RateLimiter } from "@/server/rate-limit/rate-limiter";
import type { RouletteRoundService } from "@/server/services/roulette-round.contract";
import { validateRouletteRoundInput } from "@/server/services/roulette-round";

const INVALID_INPUT_MESSAGE = "Bitte prüfe Einsatz und Farbwahl.";
const SAFE_ROULETTE_ERROR =
  "Die Runde konnte nicht durchgeführt werden. Bitte versuche es erneut.";
const RATE_LIMITED_MESSAGE =
  "Zu viele Spielrunden in kurzer Zeit. Bitte warte kurz und versuche es erneut.";

export interface RouletteActionHandlerProps {
  readonly rouletteService: RouletteRoundService;
  readonly getSessionToken: () => string | null | Promise<string | null>;
  readonly authorizeRequest: (
    sessionToken: string | null,
  ) =>
    | CookieMutationAuthorizationResult
    | Promise<CookieMutationAuthorizationResult>;
  readonly rateLimiter: Pick<RateLimiter, "consume">;
  readonly revalidateRouletteViews: () => void | Promise<void>;
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

function errorState(
  message: string,
  fieldErrors: Extract<
    RouletteActionState,
    { status: "error" }
  >["fieldErrors"] = {},
): RouletteActionState {
  return { status: "error", message, fieldErrors };
}

export function createRouletteActionHandler({
  rouletteService,
  getSessionToken,
  authorizeRequest,
  rateLimiter,
  revalidateRouletteViews,
}: RouletteActionHandlerProps): RouletteAction {
  return async function rouletteAction(
    previousState,
    formData,
  ): Promise<RouletteActionState> {
    void previousState;

    const validation = validateRouletteRoundInput(
      formDataToUntrustedInput(formData),
    );

    if (!validation.success) {
      return errorState(INVALID_INPUT_MESSAGE, validation.fieldErrors);
    }

    const sessionToken = await getSessionToken();
    const authorization = await authorizeRequest(sessionToken);

    if (!authorization.ok) {
      return authorization.code === "AUTHENTICATION_REQUIRED"
        ? errorState(
            "Deine Sitzung ist nicht mehr gültig. Bitte melde dich erneut an.",
          )
        : errorState(SAFE_ROULETTE_ERROR);
    }

    const rateLimit = rateLimiter.consume(
      `game:${authorization.principal.accountId}`,
    );

    if (!rateLimit.allowed) {
      return errorState(RATE_LIMITED_MESSAGE);
    }

    const result = await rouletteService.play(sessionToken, validation.data);

    if (!result.ok) {
      switch (result.code) {
        case "INVALID_INPUT":
          return errorState(INVALID_INPUT_MESSAGE);
        case "INSUFFICIENT_CREDITS":
          return errorState(
            "Für diesen Einsatz reichen deine Credits nicht aus.",
          );
        case "REQUEST_CONFLICT":
          return errorState(
            "Diese Anfrage wurde bereits mit anderen Werten verwendet.",
          );
        case "AUTHENTICATION_REQUIRED":
          return errorState(
            "Deine Sitzung ist nicht mehr gültig. Bitte melde dich erneut an.",
          );
        case "ROUND_FAILED":
          return errorState(SAFE_ROULETTE_ERROR);
      }
    }

    await revalidateRouletteViews();

    return {
      status: "success",
      message: result.replayed
        ? "Die bereits abgerechnete Runde wird erneut angezeigt."
        : "Die Runde wurde abgerechnet.",
      replayed: result.replayed,
      round: result.round,
    };
  };
}
