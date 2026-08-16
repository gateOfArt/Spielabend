import "server-only";

import { randomUUID } from "node:crypto";
import type { Account, CreditTransaction } from "@/domain/account";
import { creditPolicy, type CreditPolicy } from "@/domain/credits";
import type { DiceGameRound, DiceOutcome } from "@/domain/dice";
import type { GameRound } from "@/domain/game-round";
import type {
  RouletteColor,
  RouletteGameRound,
  RouletteOutcome,
  RouletteSelection,
} from "@/domain/roulette";
import {
  inMemoryStore,
  type DiceRoundCommitResult,
  type InMemoryStore,
  type RouletteRoundCommitResult,
} from "@/server/store/in-memory-store";

export type AccountCreationStage = "account-write" | "ledger-write";

export interface AccountCreationHooks {
  afterStage?(stage: AccountCreationStage): void;
}

export interface RuntimeUnitOfWorkProps {
  store: InMemoryStore;
  creditPolicy: CreditPolicy;
  generateId: () => string;
  now: () => Date;
  hooks?: AccountCreationHooks;
}

export interface CreateAccountCommand {
  displayName: string;
  normalizedEmail: string;
  passwordHash: string;
}

export interface SettleDiceRoundCommand {
  readonly accountId: string;
  readonly expectedBalance: number;
  readonly requestId: string;
  readonly bet: number;
  readonly prediction: number;
  readonly result: number;
  readonly outcome: DiceOutcome;
  readonly netDelta: number;
  readonly finalCredits: number;
}

export interface SettleRouletteRoundCommand {
  readonly accountId: string;
  readonly expectedBalance: number;
  readonly requestId: string;
  readonly bet: number;
  readonly selection: RouletteSelection;
  readonly result: number;
  readonly color: RouletteColor;
  readonly outcome: RouletteOutcome;
  readonly netDelta: number;
  readonly finalCredits: number;
}

export class DuplicateNormalizedEmailError extends Error {
  constructor() {
    super("Normalized email is unavailable");
    this.name = "DuplicateNormalizedEmailError";
  }
}

export class RuntimeUnitOfWork {
  private readonly store: InMemoryStore;
  private readonly creditPolicy: CreditPolicy;
  private readonly generateId: () => string;
  private readonly now: () => Date;
  private readonly hooks?: AccountCreationHooks;

  constructor({
    store,
    creditPolicy,
    generateId,
    now,
    hooks,
  }: RuntimeUnitOfWorkProps) {
    this.store = store;
    this.creditPolicy = creditPolicy;
    this.generateId = generateId;
    this.now = now;
    this.hooks = hooks;
  }

  createAccountWithStartingCredit(command: CreateAccountCommand): Account {
    const startingBalance = this.creditPolicy.calculateResultingBalance(
      0,
      this.creditPolicy.startingDelta,
    );

    if (
      startingBalance === null ||
      this.creditPolicy.startingDelta <= 0 ||
      this.creditPolicy.startingReason !== "STARTING_CREDIT"
    ) {
      throw new Error("Starting-credit policy is invalid");
    }

    const createdAt = this.now().toISOString();
    const account: Account = {
      id: this.generateId(),
      displayName: command.displayName,
      normalizedEmail: command.normalizedEmail,
      passwordHash: command.passwordHash,
      credits: startingBalance,
      createdAt,
    };

    this.hooks?.afterStage?.("account-write");

    const transaction: CreditTransaction = {
      id: this.generateId(),
      accountId: account.id,
      roundId: null,
      delta: this.creditPolicy.startingDelta,
      reason: this.creditPolicy.startingReason,
      resultingBalance: startingBalance,
      createdAt,
    };

    this.hooks?.afterStage?.("ledger-write");

    const result = this.store.commitAccountWithStartingCredit({
      account,
      transaction,
    });

    if (result === "duplicate-email") {
      throw new DuplicateNormalizedEmailError();
    }

    return account;
  }

  findDiceRoundByRequest(
    accountId: string,
    requestId: string,
  ): DiceGameRound | null {
    const round = this.store.findGameRoundByRequest(accountId, requestId);

    return round && round.game === "DICE" ? round : null;
  }

  findRouletteRoundByRequest(
    accountId: string,
    requestId: string,
  ): RouletteGameRound | null {
    const round = this.store.findGameRoundByRequest(accountId, requestId);

    return round && round.game === "ROULETTE" ? round : null;
  }

  settleDiceRound(command: SettleDiceRoundCommand): DiceRoundCommitResult {
    const createdAt = this.now().toISOString();
    const roundId = this.generateId();
    const transactionId = this.generateId();
    const round: GameRound = {
      id: roundId,
      accountId: command.accountId,
      transactionId,
      requestId: command.requestId,
      game: "DICE",
      bet: command.bet,
      prediction: command.prediction,
      result: command.result,
      outcome: command.outcome,
      netDelta: command.netDelta,
      finalCredits: command.finalCredits,
      createdAt,
    };
    const transaction: CreditTransaction = {
      id: transactionId,
      accountId: command.accountId,
      roundId,
      delta: command.netDelta,
      reason: "DICE_ROUND",
      resultingBalance: command.finalCredits,
      createdAt,
    };

    return this.store.commitDiceRound({
      expectedBalance: command.expectedBalance,
      round,
      transaction,
    });
  }

  settleRouletteRound(
    command: SettleRouletteRoundCommand,
  ): RouletteRoundCommitResult {
    const createdAt = this.now().toISOString();
    const roundId = this.generateId();
    const transactionId = this.generateId();
    const round: GameRound = {
      id: roundId,
      accountId: command.accountId,
      transactionId,
      requestId: command.requestId,
      game: "ROULETTE",
      bet: command.bet,
      selection: command.selection,
      result: command.result,
      color: command.color,
      outcome: command.outcome,
      netDelta: command.netDelta,
      finalCredits: command.finalCredits,
      createdAt,
    };
    const transaction: CreditTransaction = {
      id: transactionId,
      accountId: command.accountId,
      roundId,
      delta: command.netDelta,
      reason: "ROULETTE_ROUND",
      resultingBalance: command.finalCredits,
      createdAt,
    };

    return this.store.commitRouletteRound({
      expectedBalance: command.expectedBalance,
      round,
      transaction,
    });
  }
}

export const runtimeUnitOfWork = new RuntimeUnitOfWork({
  store: inMemoryStore,
  creditPolicy,
  generateId: randomUUID,
  now: () => new Date(),
});
