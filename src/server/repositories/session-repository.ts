import "server-only";

import type { SessionRecord } from "@/server/auth/authentication.contract";
import type { InMemoryStore } from "@/server/store/in-memory-store";

export class SessionRepository {
  constructor(private readonly store: InMemoryStore) {}

  create(session: SessionRecord): void {
    this.store.commitSession(session);
  }

  findByTokenHash(tokenHash: string): SessionRecord | null {
    return this.store.findSessionByTokenHash(tokenHash);
  }

  deleteByTokenHash(tokenHash: string): boolean {
    return this.store.deleteSessionByTokenHash(tokenHash);
  }

  listAll(): readonly SessionRecord[] {
    return this.store.listSessions();
  }
}
