import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Account } from "@/domain/account";
import {
  SESSION_POLICY,
  type AuthenticationSessionService,
  type CookieMutationAuthorizationResult,
  type LoginResult,
  type LogoutResult,
  type PasswordVerifier,
  type SessionAuthenticationResult,
  type SessionCookie,
  type SessionTokenGenerator,
  type SessionTokenHasher,
} from "@/server/auth/authentication.contract";
import { Argon2PasswordHasher } from "@/server/auth/password-hasher";
import {
  OpaqueSessionTokenGenerator,
  Sha256SessionTokenHasher,
} from "@/server/auth/session-crypto";
import { AccountRepository } from "@/server/repositories/account-repository";
import { SessionRepository } from "@/server/repositories/session-repository";
import { inMemoryStore } from "@/server/store/in-memory-store";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$nvduIGUxdH9uEf9RnBOIdQ$O22OFgmyVPdTTG0JZOEeZtY2g9bACcXaOuwKArF75ks";

const loginCredentialsSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(128),
});

const sessionTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/u);

const sameOriginMutationEvidenceSchema = z.object({
  method: z.enum(SESSION_POLICY.csrf.unsafeMethods),
  origin: z.url(),
  trustedOrigin: z.url(),
  secFetchSite: z.string().nullable().optional(),
});

const cookieMutationEvidenceSchema = sameOriginMutationEvidenceSchema.extend({
  sessionToken: z.unknown(),
});

type ValidatedLoginCredentials = z.infer<typeof loginCredentialsSchema>;

export type LoginCredentialsValidationResult =
  | { readonly success: true; readonly data: ValidatedLoginCredentials }
  | { readonly success: false };

export interface AuthenticationSessionServiceProps {
  readonly accountRepository: AccountRepository;
  readonly sessionRepository: SessionRepository;
  readonly passwordVerifier: PasswordVerifier;
  readonly tokenGenerator: SessionTokenGenerator;
  readonly tokenHasher: SessionTokenHasher;
  readonly generateId: () => string;
  readonly now: () => Date;
  readonly isProduction: boolean;
}

export function validateLoginCredentials(
  credentials: unknown,
): LoginCredentialsValidationResult {
  const result = loginCredentialsSchema.safeParse(credentials);

  return result.success
    ? { success: true, data: result.data }
    : { success: false };
}

export function isSameOriginMutationEvidence(evidence: unknown): boolean {
  const result = sameOriginMutationEvidenceSchema.safeParse(evidence);

  if (!result.success) {
    return false;
  }

  const { origin, trustedOrigin, secFetchSite } = result.data;

  if (new URL(origin).origin !== new URL(trustedOrigin).origin) {
    return false;
  }

  return (
    secFetchSite === undefined ||
    secFetchSite === null ||
    secFetchSite === SESSION_POLICY.csrf.allowedFetchSite
  );
}

export class DefaultAuthenticationSessionService
  implements AuthenticationSessionService
{
  constructor(
    private readonly props: AuthenticationSessionServiceProps,
  ) {}

  async login(credentials: unknown): Promise<LoginResult> {
    const validation = validateLoginCredentials(credentials);

    if (!validation.success) {
      return { ok: false, code: "INVALID_CREDENTIALS" };
    }

    const account = this.props.accountRepository.findByNormalizedEmail(
      validation.data.email,
    );
    const passwordHash = account?.passwordHash ?? DUMMY_PASSWORD_HASH;

    try {
      const passwordMatches = await this.props.passwordVerifier.verify(
        passwordHash,
        validation.data.password,
      );

      if (!passwordMatches || !account) {
        return { ok: false, code: "INVALID_CREDENTIALS" };
      }

      return this.createSession(account);
    } catch {
      return { ok: false, code: "LOGIN_FAILED" };
    }
  }

  authenticate(sessionToken: unknown): Promise<SessionAuthenticationResult> {
    const tokenValidation = sessionTokenSchema.safeParse(sessionToken);

    if (!tokenValidation.success) {
      return Promise.resolve({
        ok: false,
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const tokenHash = this.props.tokenHasher.hash(tokenValidation.data);
    const session = this.props.sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      return Promise.resolve({
        ok: false,
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    if (Date.parse(session.expiresAt) <= this.props.now().getTime()) {
      this.props.sessionRepository.deleteByTokenHash(tokenHash);

      return Promise.resolve({
        ok: false,
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    if (!this.props.accountRepository.findById(session.accountId)) {
      this.props.sessionRepository.deleteByTokenHash(tokenHash);

      return Promise.resolve({
        ok: false,
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    return Promise.resolve({
      ok: true,
      principal: {
        accountId: session.accountId,
        sessionId: session.id,
      },
    });
  }

  requireAuthenticatedAccount(
    sessionToken: unknown,
  ): Promise<SessionAuthenticationResult> {
    return this.authenticate(sessionToken);
  }

  logout(sessionToken: unknown): Promise<LogoutResult> {
    const tokenValidation = sessionTokenSchema.safeParse(sessionToken);

    if (tokenValidation.success) {
      this.props.sessionRepository.deleteByTokenHash(
        this.props.tokenHasher.hash(tokenValidation.data),
      );
    }

    return Promise.resolve({
      ok: true,
      cookie: this.createExpiredCookie(),
    });
  }

  async authorizeCookieMutation(
    requestEvidence: unknown,
  ): Promise<CookieMutationAuthorizationResult> {
    if (!isSameOriginMutationEvidence(requestEvidence)) {
      return { ok: false, code: "UNSAFE_REQUEST" };
    }

    const { sessionToken } = cookieMutationEvidenceSchema.parse(
      requestEvidence,
    );
    const authentication = await this.authenticate(sessionToken);

    return authentication.ok
      ? authentication
      : { ok: false, code: "AUTHENTICATION_REQUIRED" };
  }

  private createSession(account: Account): LoginResult {
    const now = this.props.now();
    const expiresAt = new Date(
      now.getTime() + SESSION_POLICY.lifetimeMs,
    ).toISOString();
    const token = this.props.tokenGenerator.generate();

    if (!sessionTokenSchema.safeParse(token).success) {
      throw new Error("Session token generator returned an invalid token");
    }

    this.props.sessionRepository.create({
      id: this.props.generateId(),
      accountId: account.id,
      tokenHash: this.props.tokenHasher.hash(token),
      createdAt: now.toISOString(),
      expiresAt,
    });

    const cookie: SessionCookie = {
      name: SESSION_POLICY.cookie.name,
      value: token,
      httpOnly: SESSION_POLICY.cookie.httpOnly,
      sameSite: SESSION_POLICY.cookie.sameSite,
      secure:
        SESSION_POLICY.cookie.secureInProduction && this.props.isProduction,
      path: SESSION_POLICY.cookie.path,
      expires: expiresAt,
    };

    return {
      ok: true,
      account: {
        displayName: account.displayName,
        credits: account.credits,
      },
      session: { token, expiresAt },
      cookie,
    };
  }

  private createExpiredCookie() {
    return {
      name: SESSION_POLICY.cookie.name,
      value: "" as const,
      httpOnly: SESSION_POLICY.cookie.httpOnly,
      sameSite: SESSION_POLICY.cookie.sameSite,
      secure:
        SESSION_POLICY.cookie.secureInProduction && this.props.isProduction,
      path: SESSION_POLICY.cookie.path,
      expires: new Date(0).toISOString(),
      maxAge: 0 as const,
    };
  }
}

const productionAccountRepository = new AccountRepository(inMemoryStore);
const productionSessionRepository = new SessionRepository(inMemoryStore);

export const authenticationSessionService =
  new DefaultAuthenticationSessionService({
    accountRepository: productionAccountRepository,
    sessionRepository: productionSessionRepository,
    passwordVerifier: new Argon2PasswordHasher(),
    tokenGenerator: new OpaqueSessionTokenGenerator(),
    tokenHasher: new Sha256SessionTokenHasher(),
    generateId: randomUUID,
    now: () => new Date(),
    isProduction: process.env.NODE_ENV === "production",
  });
