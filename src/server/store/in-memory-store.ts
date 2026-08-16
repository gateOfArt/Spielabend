import "server-only";

import type { Account, CreditTransaction } from "@/domain/account";
import {
  DICE_ROUND_CREDIT_REASON,
  ROULETTE_ROUND_CREDIT_REASON,
  STARTING_CREDIT_REASON,
} from "@/domain/credits";
import type { GameRound } from "@/domain/game-round";
import type { SessionRecord } from "@/server/auth/authentication.contract";

interface StoreState {
  readonly accountsById: ReadonlyMap<string, Account>;
  readonly accountIdByNormalizedEmail: ReadonlyMap<string, string>;
  readonly creditTransactionsById: ReadonlyMap<string, CreditTransaction>;
  readonly gameRoundsById: ReadonlyMap<string, GameRound>;
  readonly gameRoundIdByRequest: ReadonlyMap<string, string>;
  readonly sessionsById: ReadonlyMap<string, SessionRecord>;
  readonly sessionIdByTokenHash: ReadonlyMap<string, string>;
}

export interface AccountWithStartingCreditWrite {
  account: Account;
  transaction: CreditTransaction;
}

export type AccountCommitResult = "created" | "duplicate-email";

export interface DiceRoundWrite {
  readonly expectedBalance: number;
  readonly round: GameRound;
  readonly transaction: CreditTransaction;
}

export type DiceRoundCommitResult =
  | { readonly status: "created"; readonly round: GameRound }
  | { readonly status: "replayed"; readonly round: GameRound }
  | { readonly status: "conflict" }
  | { readonly status: "balance-changed" };

export interface RouletteRoundWrite {
  readonly expectedBalance: number;
  readonly round: GameRound;
  readonly transaction: CreditTransaction;
}

export type RouletteRoundCommitResult =
  | { readonly status: "created"; readonly round: GameRound }
  | { readonly status: "replayed"; readonly round: GameRound }
  | { readonly status: "conflict" }
  | { readonly status: "balance-changed" };

function createEmptyState(): StoreState {
  return {
    accountsById: new Map(),
    accountIdByNormalizedEmail: new Map(),
    creditTransactionsById: new Map(),
    gameRoundsById: new Map(),
    gameRoundIdByRequest: new Map(),
    sessionsById: new Map(),
    sessionIdByTokenHash: new Map(),
  };
}

function copyAccount(account: Account): Account {
  return { ...account };
}

function copyTransaction(transaction: CreditTransaction): CreditTransaction {
  return { ...transaction };
}

function copySession(session: SessionRecord): SessionRecord {
  return { ...session };
}

function copyGameRound(round: GameRound): GameRound {
  return { ...round };
}

function requestKey(accountId: string, requestId: string): string {
  return JSON.stringify([accountId, requestId]);
}

export class InMemoryStore {
  #state: StoreState = createEmptyState();

  findAccountByNormalizedEmail(normalizedEmail: string): Account | null {
    const accountId = this.#state.accountIdByNormalizedEmail.get(normalizedEmail);
    const account = accountId
      ? this.#state.accountsById.get(accountId)
      : undefined;

    return account ? copyAccount(account) : null;
  }

  findAccountById(accountId: string): Account | null {
    const account = this.#state.accountsById.get(accountId);

    return account ? copyAccount(account) : null;
  }

  listAccounts(): readonly Account[] {
    return Array.from(this.#state.accountsById.values(), copyAccount);
  }

  listCreditTransactions(): readonly CreditTransaction[] {
    return Array.from(
      this.#state.creditTransactionsById.values(),
      copyTransaction,
    );
  }

  listGameRounds(): readonly GameRound[] {
    return Array.from(this.#state.gameRoundsById.values(), copyGameRound);
  }

  findGameRoundByRequest(
    accountId: string,
    requestId: string,
  ): GameRound | null {
    const roundId = this.#state.gameRoundIdByRequest.get(
      requestKey(accountId, requestId),
    );
    const round = roundId
      ? this.#state.gameRoundsById.get(roundId)
      : undefined;

    return round ? copyGameRound(round) : null;
  }

  findSessionByTokenHash(tokenHash: string): SessionRecord | null {
    const sessionId = this.#state.sessionIdByTokenHash.get(tokenHash);
    const session = sessionId
      ? this.#state.sessionsById.get(sessionId)
      : undefined;

    return session ? copySession(session) : null;
  }

  listSessions(): readonly SessionRecord[] {
    return Array.from(this.#state.sessionsById.values(), copySession);
  }

  commitSession(session: SessionRecord): void {
    const createdAt = Date.parse(session.createdAt);
    const expiresAt = Date.parse(session.expiresAt);

    if (
      !this.#state.accountsById.has(session.accountId) ||
      !session.tokenHash ||
      !Number.isFinite(createdAt) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= createdAt
    ) {
      throw new Error("Session invariant failed");
    }

    if (
      this.#state.sessionsById.has(session.id) ||
      this.#state.sessionIdByTokenHash.has(session.tokenHash)
    ) {
      throw new Error("Generated session identifier collision");
    }

    const sessionsById = new Map(this.#state.sessionsById);
    const sessionIdByTokenHash = new Map(this.#state.sessionIdByTokenHash);
    sessionsById.set(session.id, copySession(session));
    sessionIdByTokenHash.set(session.tokenHash, session.id);

    this.#state = {
      ...this.#state,
      sessionsById,
      sessionIdByTokenHash,
    };
  }

  deleteSessionByTokenHash(tokenHash: string): boolean {
    const sessionId = this.#state.sessionIdByTokenHash.get(tokenHash);

    if (!sessionId) {
      return false;
    }

    const sessionsById = new Map(this.#state.sessionsById);
    const sessionIdByTokenHash = new Map(this.#state.sessionIdByTokenHash);
    sessionsById.delete(sessionId);
    sessionIdByTokenHash.delete(tokenHash);

    this.#state = {
      ...this.#state,
      sessionsById,
      sessionIdByTokenHash,
    };

    return true;
  }

  commitAccountWithStartingCredit(
    write: AccountWithStartingCreditWrite,
  ): AccountCommitResult {
    const { account, transaction } = write;

    if (this.#state.accountIdByNormalizedEmail.has(account.normalizedEmail)) {
      return "duplicate-email";
    }

    if (
      this.#state.accountsById.has(account.id) ||
      this.#state.creditTransactionsById.has(transaction.id)
    ) {
      throw new Error("Generated identifier collision");
    }

    if (
      transaction.accountId !== account.id ||
      transaction.roundId !== null ||
      transaction.reason !== STARTING_CREDIT_REASON ||
      transaction.delta !== account.credits ||
      transaction.resultingBalance !== account.credits ||
      !Number.isSafeInteger(account.credits) ||
      account.credits < 0
    ) {
      throw new Error("Account starting-credit invariant failed");
    }

    const accountsById = new Map(this.#state.accountsById);
    const accountIdByNormalizedEmail = new Map(
      this.#state.accountIdByNormalizedEmail,
    );
    const creditTransactionsById = new Map(
      this.#state.creditTransactionsById,
    );

    accountsById.set(account.id, copyAccount(account));
    accountIdByNormalizedEmail.set(account.normalizedEmail, account.id);
    creditTransactionsById.set(
      transaction.id,
      copyTransaction(transaction),
    );

    this.#state = {
      accountsById,
      accountIdByNormalizedEmail,
      creditTransactionsById,
      gameRoundsById: this.#state.gameRoundsById,
      gameRoundIdByRequest: this.#state.gameRoundIdByRequest,
      sessionsById: this.#state.sessionsById,
      sessionIdByTokenHash: this.#state.sessionIdByTokenHash,
    };

    return "created";
  }

  commitDiceRound(write: DiceRoundWrite): DiceRoundCommitResult {
    const { expectedBalance, round, transaction } = write;
    const idempotencyKey = requestKey(round.accountId, round.requestId);
    const existingRoundId = this.#state.gameRoundIdByRequest.get(
      idempotencyKey,
    );

    if (existingRoundId) {
      const existingRound = this.#state.gameRoundsById.get(existingRoundId);

      if (!existingRound) {
        throw new Error("Dice idempotency index invariant failed");
      }

      return existingRound.game === "DICE" &&
        round.game === "DICE" &&
        existingRound.bet === round.bet &&
        existingRound.prediction === round.prediction
        ? { status: "replayed", round: copyGameRound(existingRound) }
        : { status: "conflict" };
    }

    const account = this.#state.accountsById.get(round.accountId);

    if (!account) {
      throw new Error("Dice account invariant failed");
    }

    if (account.credits !== expectedBalance) {
      return { status: "balance-changed" };
    }

    if (
      this.#state.gameRoundsById.has(round.id) ||
      this.#state.creditTransactionsById.has(transaction.id)
    ) {
      throw new Error("Generated Dice identifier collision");
    }

    const calculatedBalance = expectedBalance + transaction.delta;

    if (
      round.game !== "DICE" ||
      transaction.reason !== DICE_ROUND_CREDIT_REASON ||
      transaction.accountId !== account.id ||
      transaction.accountId !== round.accountId ||
      transaction.roundId !== round.id ||
      round.transactionId !== transaction.id ||
      round.netDelta !== transaction.delta ||
      round.finalCredits !== transaction.resultingBalance ||
      round.finalCredits !== calculatedBalance ||
      round.createdAt !== transaction.createdAt ||
      !Number.isSafeInteger(expectedBalance) ||
      !Number.isSafeInteger(transaction.delta) ||
      !Number.isSafeInteger(calculatedBalance) ||
      calculatedBalance < 0
    ) {
      throw new Error("Dice settlement invariant failed");
    }

    const accountsById = new Map(this.#state.accountsById);
    const creditTransactionsById = new Map(
      this.#state.creditTransactionsById,
    );
    const gameRoundsById = new Map(this.#state.gameRoundsById);
    const gameRoundIdByRequest = new Map(
      this.#state.gameRoundIdByRequest,
    );

    accountsById.set(account.id, {
      ...account,
      credits: calculatedBalance,
    });
    creditTransactionsById.set(
      transaction.id,
      copyTransaction(transaction),
    );
    gameRoundsById.set(round.id, copyGameRound(round));
    gameRoundIdByRequest.set(idempotencyKey, round.id);

    this.#state = {
      ...this.#state,
      accountsById,
      creditTransactionsById,
      gameRoundsById,
      gameRoundIdByRequest,
    };

    return { status: "created", round: copyGameRound(round) };
  }

  commitRouletteRound(write: RouletteRoundWrite): RouletteRoundCommitResult {
    const { expectedBalance, round, transaction } = write;
    const idempotencyKey = requestKey(round.accountId, round.requestId);
    const existingRoundId = this.#state.gameRoundIdByRequest.get(
      idempotencyKey,
    );

    if (existingRoundId) {
      const existingRound = this.#state.gameRoundsById.get(existingRoundId);

      if (!existingRound) {
        throw new Error("Roulette idempotency index invariant failed");
      }

      return existingRound.game === "ROULETTE" &&
        round.game === "ROULETTE" &&
        existingRound.bet === round.bet &&
        existingRound.selection === round.selection
        ? { status: "replayed", round: copyGameRound(existingRound) }
        : { status: "conflict" };
    }

    const account = this.#state.accountsById.get(round.accountId);

    if (!account) {
      throw new Error("Roulette account invariant failed");
    }

    if (account.credits !== expectedBalance) {
      return { status: "balance-changed" };
    }

    if (
      this.#state.gameRoundsById.has(round.id) ||
      this.#state.creditTransactionsById.has(transaction.id)
    ) {
      throw new Error("Generated Roulette identifier collision");
    }

    const calculatedBalance = expectedBalance + transaction.delta;

    if (
      round.game !== "ROULETTE" ||
      transaction.reason !== ROULETTE_ROUND_CREDIT_REASON ||
      transaction.accountId !== account.id ||
      transaction.accountId !== round.accountId ||
      transaction.roundId !== round.id ||
      round.transactionId !== transaction.id ||
      round.netDelta !== transaction.delta ||
      round.finalCredits !== transaction.resultingBalance ||
      round.finalCredits !== calculatedBalance ||
      round.createdAt !== transaction.createdAt ||
      !Number.isSafeInteger(expectedBalance) ||
      !Number.isSafeInteger(transaction.delta) ||
      !Number.isSafeInteger(calculatedBalance) ||
      calculatedBalance < 0
    ) {
      throw new Error("Roulette settlement invariant failed");
    }

    const accountsById = new Map(this.#state.accountsById);
    const creditTransactionsById = new Map(
      this.#state.creditTransactionsById,
    );
    const gameRoundsById = new Map(this.#state.gameRoundsById);
    const gameRoundIdByRequest = new Map(
      this.#state.gameRoundIdByRequest,
    );

    accountsById.set(account.id, {
      ...account,
      credits: calculatedBalance,
    });
    creditTransactionsById.set(
      transaction.id,
      copyTransaction(transaction),
    );
    gameRoundsById.set(round.id, copyGameRound(round));
    gameRoundIdByRequest.set(idempotencyKey, round.id);

    this.#state = {
      ...this.#state,
      accountsById,
      creditTransactionsById,
      gameRoundsById,
      gameRoundIdByRequest,
    };

    return { status: "created", round: copyGameRound(round) };
  }
}

const productionStoreKey: unique symbol = Symbol.for(
  "spieleabend.production-in-memory-store",
);
const runtimeGlobal = globalThis as typeof globalThis & {
  [productionStoreKey]?: InMemoryStore;
};

export const inMemoryStore =
  runtimeGlobal[productionStoreKey] ?? new InMemoryStore();

runtimeGlobal[productionStoreKey] = inMemoryStore;
