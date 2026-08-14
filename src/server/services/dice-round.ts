import "server-only";

import { randomInt } from "node:crypto";
import { z } from "zod";
import type { CreditService } from "@/domain/credits";
import type {
  DiceField,
  DiceFieldErrors,
  DiceRoundDto,
  DiceRoundResult,
  GameRound,
} from "@/domain/dice";
import type { AuthenticationSessionService } from "@/server/auth/authentication.contract";
import { AccountRepository } from "@/server/repositories/account-repository";
import { authenticationSessionService } from "@/server/services/authentication-session";
import {
  DICE_RULE,
  type DiceRoundService,
  type RandomSource,
} from "@/server/services/dice-round.contract";
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

export const diceRoundInputSchema = z.strictObject({
  requestId: z.uuidv4({ error: "Die Request-ID ist ungültig." }),
  bet: integerInputSchema.pipe(
    z
      .number()
      .int({ error: "Der Einsatz muss ganzzahlig sein." })
      .min(DICE_RULE.minimumBet, {
        error: `Der Einsatz muss mindestens ${DICE_RULE.minimumBet} Credit betragen.`,
      })
      .max(DICE_RULE.maximumBet, {
        error: `Der Einsatz darf höchstens ${DICE_RULE.maximumBet} Credits betragen.`,
      }),
  ),
  prediction: integerInputSchema.pipe(
    z
      .number()
      .int({ error: "Die Vorhersage muss ganzzahlig sein." })
      .min(DICE_RULE.minimumFace, {
        error: `Die Vorhersage muss mindestens ${DICE_RULE.minimumFace} sein.`,
      })
      .max(DICE_RULE.maximumFace, {
        error: `Die Vorhersage darf höchstens ${DICE_RULE.maximumFace} sein.`,
      }),
  ),
});

export type ValidatedDiceRoundInput = z.infer<typeof diceRoundInputSchema>;

export type DiceRoundValidationResult =
  | { readonly success: true; readonly data: ValidatedDiceRoundInput }
  | { readonly success: false; readonly fieldErrors: DiceFieldErrors };

export interface DiceRoundServiceProps {
  readonly authenticationService: Pick<
    AuthenticationSessionService,
    "requireAuthenticatedAccount"
  >;
  readonly accountRepository: AccountRepository;
  readonly creditService: CreditService;
  readonly unitOfWork: RuntimeUnitOfWork;
  readonly randomSource: RandomSource;
}

function mapFieldErrors(error: z.ZodError): DiceFieldErrors {
  const fieldErrors: DiceFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      field !== "requestId" &&
      field !== "bet" &&
      field !== "prediction"
    ) {
      continue;
    }

    const diceField: DiceField = field;
    fieldErrors[diceField] = [
      ...(fieldErrors[diceField] ?? []),
      issue.message,
    ];
  }

  return fieldErrors;
}

export function validateDiceRoundInput(
  input: unknown,
): DiceRoundValidationResult {
  const result = diceRoundInputSchema.safeParse(input);

  return result.success
    ? { success: true, data: result.data }
    : { success: false, fieldErrors: mapFieldErrors(result.error) };
}

function toDto(round: GameRound): DiceRoundDto {
  return {
    requestId: round.requestId,
    bet: round.bet,
    prediction: round.prediction,
    result: round.result,
    outcome: round.outcome,
    netDelta: round.netDelta,
    finalCredits: round.finalCredits,
  };
}

export class CryptoDiceRandomSource implements RandomSource {
  rollDie(): number {
    return randomInt(DICE_RULE.minimumFace, DICE_RULE.maximumFace + 1);
  }
}

export class DefaultDiceRoundService implements DiceRoundService {
  constructor(private readonly props: DiceRoundServiceProps) {}

  async play(sessionToken: unknown, input: unknown): Promise<DiceRoundResult> {
    const validation = validateDiceRoundInput(input);

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

    const existingRound = this.props.unitOfWork.findDiceRoundByRequest(
      account.id,
      validation.data.requestId,
    );

    if (existingRound) {
      return existingRound.bet === validation.data.bet &&
        existingRound.prediction === validation.data.prediction
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
      const result = this.props.randomSource.rollDie();

      if (
        !Number.isSafeInteger(result) ||
        result < DICE_RULE.minimumFace ||
        result > DICE_RULE.maximumFace
      ) {
        return { ok: false, code: "ROUND_FAILED" };
      }

      const outcome =
        result === validation.data.prediction ? "win" : "loss";
      const netDelta =
        outcome === "win"
          ? validation.data.bet * DICE_RULE.winNetMultiplier
          : -validation.data.bet;
      const finalCredits =
        this.props.creditService.calculateResultingBalance(
          account.credits,
          netDelta,
        );

      if (finalCredits === null) {
        return { ok: false, code: "ROUND_FAILED" };
      }

      const commit = this.props.unitOfWork.settleDiceRound({
        accountId: account.id,
        expectedBalance: account.credits,
        requestId: validation.data.requestId,
        bet: validation.data.bet,
        prediction: validation.data.prediction,
        result,
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

export const diceRoundService = new DefaultDiceRoundService({
  authenticationService: authenticationSessionService,
  accountRepository: productionAccountRepository,
  creditService: creditPolicy,
  unitOfWork: runtimeUnitOfWork,
  randomSource: new CryptoDiceRandomSource(),
});
