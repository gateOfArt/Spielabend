import "server-only";

import type { GameRound } from "@/domain/game-round";
import type { RouletteColor, RouletteSelection } from "@/domain/roulette";
import type { SessionAuthenticationResult } from "@/server/auth/authentication.contract";
import { GameRoundRepository } from "@/server/repositories/game-round-repository";
import { authenticationSessionService } from "@/server/services/authentication-session";
import { inMemoryStore } from "@/server/store/in-memory-store";

export interface DiceGameRoundReadDto {
  readonly game: "DICE";
  readonly requestId: string;
  readonly bet: number;
  readonly prediction: number;
  readonly result: number;
  readonly outcome: "win" | "loss";
  readonly netDelta: number;
  readonly finalCredits: number;
  readonly createdAt: string;
}

export interface RouletteGameRoundReadDto {
  readonly game: "ROULETTE";
  readonly requestId: string;
  readonly bet: number;
  readonly selection: RouletteSelection;
  readonly result: number;
  readonly color: RouletteColor;
  readonly outcome: "win" | "loss";
  readonly netDelta: number;
  readonly finalCredits: number;
  readonly createdAt: string;
}

export type GameRoundReadDto = DiceGameRoundReadDto | RouletteGameRoundReadDto;

export type GameRoundQueryResult =
  | { readonly ok: true; readonly rounds: readonly GameRoundReadDto[] }
  | { readonly ok: false; readonly code: "AUTHENTICATION_REQUIRED" };

export interface GameRoundAuthenticator {
  requireAuthenticatedAccount(
    sessionToken: unknown,
  ): Promise<SessionAuthenticationResult>;
}

export interface GameRoundAccountReader {
  listByAccountId(accountId: string): readonly GameRound[];
}

export interface GameRoundQueryServiceProps {
  readonly authenticator: GameRoundAuthenticator;
  readonly roundReader: GameRoundAccountReader;
}

export class GameRoundQueryService {
  constructor(private readonly props: GameRoundQueryServiceProps) {}

  async read(sessionToken: unknown): Promise<GameRoundQueryResult> {
    const authentication =
      await this.props.authenticator.requireAuthenticatedAccount(sessionToken);

    if (!authentication.ok) {
      return { ok: false, code: "AUTHENTICATION_REQUIRED" };
    }

    const accountId = authentication.principal.accountId;
    const rounds = this.props.roundReader
      .listByAccountId(accountId)
      .filter((round) => round.accountId === accountId)
      .sort((left, right) => {
        if (left.createdAt !== right.createdAt) {
          return left.createdAt > right.createdAt ? -1 : 1;
        }

        if (left.requestId === right.requestId) {
          return 0;
        }

        return left.requestId < right.requestId ? -1 : 1;
      })
      .map(toDto);

    return { ok: true, rounds };
  }
}

function toDto(round: GameRound): GameRoundReadDto {
  if (round.game === "DICE") {
    return {
      game: "DICE",
      requestId: round.requestId,
      bet: round.bet,
      prediction: round.prediction,
      result: round.result,
      outcome: round.outcome,
      netDelta: round.netDelta,
      finalCredits: round.finalCredits,
      createdAt: round.createdAt,
    };
  }

  return {
    game: "ROULETTE",
    requestId: round.requestId,
    bet: round.bet,
    selection: round.selection,
    result: round.result,
    color: round.color,
    outcome: round.outcome,
    netDelta: round.netDelta,
    finalCredits: round.finalCredits,
    createdAt: round.createdAt,
  };
}

const productionGameRoundRepository = new GameRoundRepository(inMemoryStore);

export const gameRoundQueryService = new GameRoundQueryService({
  authenticator: authenticationSessionService,
  roundReader: productionGameRoundRepository,
});
