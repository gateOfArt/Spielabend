import type { CreditTransactionReason } from "@/domain/credits";

export interface Account {
  readonly id: string;
  readonly displayName: string;
  readonly normalizedEmail: string;
  readonly passwordHash: string;
  readonly credits: number;
  readonly createdAt: string;
}

export interface CreditTransaction {
  readonly id: string;
  readonly accountId: string;
  readonly roundId: string | null;
  readonly delta: number;
  readonly reason: CreditTransactionReason;
  readonly resultingBalance: number;
  readonly createdAt: string;
}
