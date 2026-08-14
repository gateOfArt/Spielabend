import "server-only";

import type { CreditTransaction } from "@/domain/account";
import type { InMemoryStore } from "@/server/store/in-memory-store";

export class CreditTransactionRepository {
  constructor(private readonly store: InMemoryStore) {}

  listAll(): readonly CreditTransaction[] {
    return this.store.listCreditTransactions();
  }
}
