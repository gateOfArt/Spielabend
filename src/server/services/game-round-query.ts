import "server-only";

import type { GameRound } from "@/domain/dice";
import type { SessionAuthenticationResult } from "@/server/auth/authentication.contract";
import { GameRoundRepository } from "@/server/repositories/game-round-repository";
import { authenticationSessionService } from "@/server/services/authentication-session";
import { inMemoryStore } from "@/server/store/in-memory-store";

export interface GameRoundReadDto {
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
  return {
    game: round.game,
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

const productionGameRoundRepository = new GameRoundRepository(inMemoryStore);

export const gameRoundQueryService = new GameRoundQueryService({
  authenticator: authenticationSessionService,
  roundReader: productionGameRoundRepository,
});
