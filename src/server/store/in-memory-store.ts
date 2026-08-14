import "server-only";

import type { Account, CreditTransaction } from "@/domain/account";
import { STARTING_CREDIT_REASON } from "@/domain/credits";

interface StoreState {
  readonly accountsById: ReadonlyMap<string, Account>;
  readonly accountIdByNormalizedEmail: ReadonlyMap<string, string>;
  readonly creditTransactionsById: ReadonlyMap<string, CreditTransaction>;
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
  };
}

function copyAccount(account: Account): Account {
  return { ...account };
}

function copyTransaction(transaction: CreditTransaction): CreditTransaction {
  return { ...transaction };
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

  listAccounts(): readonly Account[] {
    return Array.from(this.#state.accountsById.values(), copyAccount);
  }

  listCreditTransactions(): readonly CreditTransaction[] {
    return Array.from(
      this.#state.creditTransactionsById.values(),
      copyTransaction,
    );
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
    };

    return "created";
  }
}

export const inMemoryStore = new InMemoryStore();
