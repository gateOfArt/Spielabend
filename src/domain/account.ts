import type { StartingCreditReason } from "@/domain/credits";

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
  readonly delta: number;
  readonly reason: StartingCreditReason;
  readonly resultingBalance: number;
  readonly createdAt: string;
}
