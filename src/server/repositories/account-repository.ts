import "server-only";

import type { Account } from "@/domain/account";
import type { InMemoryStore } from "@/server/store/in-memory-store";

export class AccountRepository {
  constructor(private readonly store: InMemoryStore) {}

  findByNormalizedEmail(normalizedEmail: string): Account | null {
    return this.store.findAccountByNormalizedEmail(normalizedEmail);
  }

  listAll(): readonly Account[] {
    return this.store.listAccounts();
  }
}
