import "server-only";

import { randomInt } from "node:crypto";
import { z } from "zod";
import type { CreditService } from "@/domain/credits";
import type {
  RouletteField,
  RouletteFieldErrors,
  RouletteRoundDto,
  RouletteRoundResult,
} from "@/domain/roulette";
import type { GameRound } from "@/domain/game-round";
import type { AuthenticationSessionService } from "@/server/auth/authentication.contract";
import { AccountRepository } from "@/server/repositories/account-repository";
import { authenticationSessionService } from "@/server/services/authentication-session";
import {
  ROULETTE_RULE,
  resolveRouletteColor,
  type RouletteRandomSource,
  type RouletteRoundService,
} from "@/server/services/roulette-round.contract";
import {
  runtimeUnitOfWork,
  type RuntimeUnitOfWork,
} from "@/server/services/runtime-unit-of-work";
import { creditPolicy } from "@/domain/credits";
import { inMemoryStore } from "@/server/store/in-memory-store";

const integerInputSchema = z.union([
  z.number(),
  z
    .string()
    .trim()
    .regex(/^\d+$/u)
    .transform((value) => Number(value)),
]);

export const rouletteRoundInputSchema = z.strictObject({
  requestId: z.uuidv4({ error: "Die Request-ID ist ungültig." }),
  bet: integerInputSchema.pipe(
    z
      .number()
      .int({ error: "Der Einsatz muss ganzzahlig sein." })
      .min(ROULETTE_RULE.minimumBet, {
        error: `Der Einsatz muss mindestens ${ROULETTE_RULE.minimumBet} Credit betragen.`,
      })
      .max(ROULETTE_RULE.maximumBet, {
        error: `Der Einsatz darf höchstens ${ROULETTE_RULE.maximumBet} Credits betragen.`,
      }),
  ),
  selection: z.enum(["RED", "BLACK"], {
    error: "Bitte wähle Rot oder Schwarz.",
  }),
});

export type ValidatedRouletteRoundInput = z.infer<
  typeof rouletteRoundInputSchema
>;

export type RouletteRoundValidationResult =
  | { readonly success: true; readonly data: ValidatedRouletteRoundInput }
  | { readonly success: false; readonly fieldErrors: RouletteFieldErrors };

export interface RouletteRoundServiceProps {
  readonly authenticationService: Pick<
    AuthenticationSessionService,
    "requireAuthenticatedAccount"
  >;
  readonly accountRepository: AccountRepository;
  readonly creditService: CreditService;
  readonly unitOfWork: RuntimeUnitOfWork;
  readonly randomSource: RouletteRandomSource;
}

function mapFieldErrors(error: z.ZodError): RouletteFieldErrors {
  const fieldErrors: RouletteFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      field !== "requestId" &&
      field !== "bet" &&
      field !== "selection"
    ) {
      continue;
    }

    const rouletteField: RouletteField = field;
    fieldErrors[rouletteField] = [
      ...(fieldErrors[rouletteField] ?? []),
      issue.message,
    ];
  }

  return fieldErrors;
}

export function validateRouletteRoundInput(
  input: unknown,
): RouletteRoundValidationResult {
  const result = rouletteRoundInputSchema.safeParse(input);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, fieldErrors: mapFieldErrors(result.error) };
}

function toDto(round: GameRound): RouletteRoundDto {
  if (round.game !== "ROULETTE") {
    throw new Error("Expected a Roulette game round");
  }

  return {
    requestId: round.requestId,
    bet: round.bet,
    selection: round.selection,
    result: round.result,
    color: round.color,
    outcome: round.outcome,
    netDelta: round.netDelta,
    finalCredits: round.finalCredits,
  };
}

export class CryptoRouletteRandomSource implements RouletteRandomSource {
  spin(): number {
    return randomInt(
      ROULETTE_RULE.minimumResult,
      ROULETTE_RULE.maximumResult + 1,
    );
  }
}

export class DefaultRouletteRoundService implements RouletteRoundService {
  constructor(private readonly props: RouletteRoundServiceProps) {}

  async play(
    sessionToken: unknown,
    input: unknown,
  ): Promise<RouletteRoundResult> {
    const validation = validateRouletteRoundInput(input);

    if (!validation.success) {
      return { ok: false, code: "INVALID_INPUT" };
    }

    const authentication =
      await this.props.authenticationService.requireAuthenticatedAccount(
        sessionToken,
      );

    if (!authentication.ok) {
      return { ok: false, code: "AUTHENTICATION_REQUIRED" };
    }

    const account = this.props.accountRepository.findById(
      authentication.principal.accountId,
    );

    if (!account) {
      return { ok: false, code: "AUTHENTICATION_REQUIRED" };
    }

    const existingRound = this.props.unitOfWork.findRouletteRoundByRequest(
      account.id,
      validation.data.requestId,
    );

    if (existingRound) {
      return existingRound.bet === validation.data.bet &&
        existingRound.selection === validation.data.selection
        ? { ok: true, replayed: true, round: toDto(existingRound) }
        : { ok: false, code: "REQUEST_CONFLICT" };
    }

    if (
      this.props.creditService.calculateResultingBalance(
        account.credits,
        -validation.data.bet,
      ) === null
    ) {
      return { ok: false, code: "INSUFFICIENT_CREDITS" };
    }

    try {
      const result = this.props.randomSource.spin();

      if (
        !Number.isSafeInteger(result) ||
        result < ROULETTE_RULE.minimumResult ||
        result > ROULETTE_RULE.maximumResult
      ) {
        return { ok: false, code: "ROUND_FAILED" };
      }

      const color = resolveRouletteColor(result);
      const outcome = color === validation.data.selection ? "win" : "loss";
      const netDelta =
        outcome === "win"
          ? validation.data.bet * ROULETTE_RULE.winNetMultiplier
          : -validation.data.bet;
      const finalCredits =
        this.props.creditService.calculateResultingBalance(
          account.credits,
          netDelta,
        );

      if (finalCredits === null) {
        return { ok: false, code: "ROUND_FAILED" };
      }

      const commit = this.props.unitOfWork.settleRouletteRound({
        accountId: account.id,
        expectedBalance: account.credits,
        requestId: validation.data.requestId,
        bet: validation.data.bet,
        selection: validation.data.selection,
        result,
        color,
        outcome,
        netDelta,
        finalCredits,
      });

      if (commit.status === "conflict") {
        return { ok: false, code: "REQUEST_CONFLICT" };
      }

      if (commit.status === "balance-changed") {
        return { ok: false, code: "ROUND_FAILED" };
      }

      return {
        ok: true,
        replayed: commit.status === "replayed",
        round: toDto(commit.round),
      };
    } catch {
      return { ok: false, code: "ROUND_FAILED" };
    }
  }
}

const productionAccountRepository = new AccountRepository(inMemoryStore);

export const rouletteRoundService = new DefaultRouletteRoundService({
  authenticationService: authenticationSessionService,
  accountRepository: productionAccountRepository,
  creditService: creditPolicy,
  unitOfWork: runtimeUnitOfWork,
  randomSource: new CryptoRouletteRandomSource(),
});
