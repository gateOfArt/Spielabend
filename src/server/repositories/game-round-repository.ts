import "server-only";

import type { GameRound } from "@/domain/dice";
import type { InMemoryStore } from "@/server/store/in-memory-store";

export class GameRoundRepository {
  constructor(private readonly store: InMemoryStore) {}

  listByAccountId(accountId: string): readonly GameRound[] {
    return this.store
      .listGameRounds()
      .filter((round) => round.accountId === accountId);
  }
}
