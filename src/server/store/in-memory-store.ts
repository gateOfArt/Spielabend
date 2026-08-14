import "server-only";

import type { Account, CreditTransaction } from "@/domain/account";
import { STARTING_CREDIT_REASON } from "@/domain/credits";
import type { SessionRecord } from "@/server/auth/authentication.contract";

interface StoreState {
  readonly accountsById: ReadonlyMap<string, Account>;
  readonly accountIdByNormalizedEmail: ReadonlyMap<string, string>;
  readonly creditTransactionsById: ReadonlyMap<string, CreditTransaction>;
  readonly sessionsById: ReadonlyMap<string, SessionRecord>;
  readonly sessionIdByTokenHash: ReadonlyMap<string, string>;
}

export interface AccountWithStartingCreditWrite {
  account: Account;
  transaction: CreditTransaction;
}

export type AccountCommitResult = "created" | "duplicate-email";

function createEmptyState(): StoreState {
  return {
    accountsById: new Map(),
    accountIdByNormalizedEmail: new Map(),
    creditTransactionsById: new Map(),
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
      sessionsById: this.#state.sessionsById,
      sessionIdByTokenHash: this.#state.sessionIdByTokenHash,
    };

    return "created";
  }
}

export const inMemoryStore = new InMemoryStore();
