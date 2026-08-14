import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_POLICY,
  type AuthenticationSessionService,
} from "@/server/auth/authentication.contract";
import { AccountRepository } from "@/server/repositories/account-repository";
import { authenticationSessionService } from "@/server/services/authentication-session";
import { inMemoryStore } from "@/server/store/in-memory-store";

export interface AuthenticatedUser {
  readonly accountId: string;
  readonly sessionId: string;
  readonly displayName: string;
  readonly credits: number;
}

export interface ResolveAuthenticatedUserProps {
  readonly service: AuthenticationSessionService;
  readonly accountRepository: AccountRepository;
}

export async function resolveAuthenticatedUser(
  sessionToken: unknown,
  { service, accountRepository }: ResolveAuthenticatedUserProps,
): Promise<AuthenticatedUser | null> {
  const authentication = await service.requireAuthenticatedAccount(
    sessionToken,
  );

  if (!authentication.ok) {
    return null;
  }

  const account = accountRepository.findById(
    authentication.principal.accountId,
  );

  if (!account) {
    return null;
  }

  return {
    accountId: account.id,
    sessionId: authentication.principal.sessionId,
    displayName: account.displayName,
    credits: account.credits,
  };
}

const productionAccountRepository = new AccountRepository(inMemoryStore);

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const sessionToken = (await cookies()).get(
    SESSION_POLICY.cookie.name,
  )?.value;
  const user = await resolveAuthenticatedUser(sessionToken, {
    service: authenticationSessionService,
    accountRepository: productionAccountRepository,
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}
