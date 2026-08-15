import "server-only";

import type { Account } from "@/domain/account";
import type { SessionAuthenticationResult } from "@/server/auth/authentication.contract";
import { AccountRepository } from "@/server/repositories/account-repository";
import { authenticationSessionService } from "@/server/services/authentication-session";
import { inMemoryStore } from "@/server/store/in-memory-store";

export interface LeaderboardEntryDto {
  readonly rank: number;
  readonly displayName: string;
  readonly credits: number;
  readonly isCurrentUser: boolean;
}

export interface LeaderboardCurrentUserDto {
  readonly displayName: string;
  readonly credits: number;
}

export type LeaderboardQueryResult =
  | {
      readonly ok: true;
      readonly currentUser: LeaderboardCurrentUserDto;
      readonly entries: readonly LeaderboardEntryDto[];
    }
  | {
      readonly ok: false;
      readonly code: "AUTHENTICATION_REQUIRED";
    };

export interface LeaderboardAuthenticator {
  requireAuthenticatedAccount(
    sessionToken: unknown,
  ): Promise<SessionAuthenticationResult>;
}

export interface LeaderboardAccountReader {
  findById(accountId: string): Account | null;
  listAll(): readonly Account[];
}

export interface LeaderboardQueryServiceProps {
  readonly authenticator: LeaderboardAuthenticator;
  readonly accountReader: LeaderboardAccountReader;
}

function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function compareLeaderboardAccounts(left: Account, right: Account): number {
  if (left.credits !== right.credits) {
    return left.credits > right.credits ? -1 : 1;
  }

  const displayNameOrder = compareText(left.displayName, right.displayName);

  return displayNameOrder === 0
    ? compareText(left.id, right.id)
    : displayNameOrder;
}

export class LeaderboardQueryService {
  constructor(private readonly props: LeaderboardQueryServiceProps) {}

  async read(sessionToken: unknown): Promise<LeaderboardQueryResult> {
    const authentication =
      await this.props.authenticator.requireAuthenticatedAccount(sessionToken);

    if (!authentication.ok) {
      return { ok: false, code: "AUTHENTICATION_REQUIRED" };
    }

    const currentAccount = this.props.accountReader.findById(
      authentication.principal.accountId,
    );

    if (!currentAccount) {
      return { ok: false, code: "AUTHENTICATION_REQUIRED" };
    }

    const sortedAccounts = [...this.props.accountReader.listAll()].sort(
      compareLeaderboardAccounts,
    );
    let currentRank = 0;
    let previousCredits: number | undefined;
    let containsCurrentAccount = false;
    const entries = sortedAccounts.map((account, index) => {
      if (previousCredits === undefined || account.credits !== previousCredits) {
        currentRank = index + 1;
      }

      previousCredits = account.credits;
      const isCurrentUser = account.id === currentAccount.id;
      containsCurrentAccount ||= isCurrentUser;

      return {
        rank: currentRank,
        displayName: account.displayName,
        credits: account.credits,
        isCurrentUser,
      };
    });

    if (!containsCurrentAccount) {
      return { ok: false, code: "AUTHENTICATION_REQUIRED" };
    }

    return {
      ok: true,
      currentUser: {
        displayName: currentAccount.displayName,
        credits: currentAccount.credits,
      },
      entries,
    };
  }
}

const productionAccountRepository = new AccountRepository(inMemoryStore);

export const leaderboardQueryService = new LeaderboardQueryService({
  authenticator: authenticationSessionService,
  accountReader: productionAccountRepository,
});
