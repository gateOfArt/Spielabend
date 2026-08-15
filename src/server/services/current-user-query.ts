import "server-only";

import type { Account } from "@/domain/account";
import type { SessionAuthenticationResult } from "@/server/auth/authentication.contract";
import { AccountRepository } from "@/server/repositories/account-repository";
import { authenticationSessionService } from "@/server/services/authentication-session";
import { inMemoryStore } from "@/server/store/in-memory-store";

export interface CurrentUserDto {
  readonly displayName: string;
  readonly credits: number;
}

export type CurrentUserQueryResult =
  | { readonly ok: true; readonly user: CurrentUserDto }
  | { readonly ok: false; readonly code: "AUTHENTICATION_REQUIRED" };

export interface CurrentUserAuthenticator {
  requireAuthenticatedAccount(
    sessionToken: unknown,
  ): Promise<SessionAuthenticationResult>;
}

export interface CurrentUserQueryServiceProps {
  readonly authenticator: CurrentUserAuthenticator;
  readonly accountRepository: CurrentUserAccountReader;
}

export interface CurrentUserAccountReader {
  findById(accountId: string): Account | null;
}

export class CurrentUserQueryService {
  constructor(private readonly props: CurrentUserQueryServiceProps) {}

  async read(sessionToken: unknown): Promise<CurrentUserQueryResult> {
    const authentication =
      await this.props.authenticator.requireAuthenticatedAccount(sessionToken);

    if (!authentication.ok) {
      return { ok: false, code: "AUTHENTICATION_REQUIRED" };
    }

    const account = this.props.accountRepository.findById(
      authentication.principal.accountId,
    );

    if (!account) {
      return { ok: false, code: "AUTHENTICATION_REQUIRED" };
    }

    return {
      ok: true,
      user: {
        displayName: account.displayName,
        credits: account.credits,
      },
    };
  }
}

const productionAccountRepository = new AccountRepository(inMemoryStore);

export const currentUserQueryService = new CurrentUserQueryService({
  authenticator: authenticationSessionService,
  accountRepository: productionAccountRepository,
});
