import "server-only";

export const SESSION_POLICY = {
  lifetimeMs: 8 * 60 * 60 * 1_000,
  tokenEntropyBytes: 32,
  tokenStorageHash: "sha256",
  cookie: {
    name: "spieleabend_session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secureInProduction: true,
  },
  csrf: {
    requireExactOriginForUnsafeMethods: true,
    allowedFetchSite: "same-origin",
    unsafeMethods: ["POST", "PUT", "PATCH", "DELETE"],
  },
} as const;

export interface SessionRecord {
  readonly id: string;
  readonly accountId: string;
  readonly tokenHash: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface AuthenticatedPrincipal {
  readonly accountId: string;
  readonly sessionId: string;
}

export interface AuthenticatedAccountDto {
  readonly displayName: string;
  readonly credits: number;
}

export interface SessionCredential {
  readonly token: string;
  readonly expiresAt: string;
}

export interface SessionCookie {
  readonly name: typeof SESSION_POLICY.cookie.name;
  readonly value: string;
  readonly httpOnly: true;
  readonly sameSite: typeof SESSION_POLICY.cookie.sameSite;
  readonly secure: boolean;
  readonly path: typeof SESSION_POLICY.cookie.path;
  readonly expires: string;
}

export interface ExpiredSessionCookie extends SessionCookie {
  readonly value: "";
  readonly maxAge: 0;
}

export type LoginErrorCode = "INVALID_CREDENTIALS" | "LOGIN_FAILED";

export type LoginResult =
  | {
      readonly ok: true;
      readonly account: AuthenticatedAccountDto;
      readonly session: SessionCredential;
      readonly cookie: SessionCookie;
    }
  | {
      readonly ok: false;
      readonly code: LoginErrorCode;
    };

export type SessionAuthenticationResult =
  | {
      readonly ok: true;
      readonly principal: AuthenticatedPrincipal;
    }
  | {
      readonly ok: false;
      readonly code: "AUTHENTICATION_REQUIRED";
    };

export type LogoutResult =
  | {
      readonly ok: true;
      readonly cookie: ExpiredSessionCookie;
    }
  | {
      readonly ok: false;
      readonly code: "LOGOUT_FAILED";
    };

export type CookieMutationAuthorizationResult =
  | {
      readonly ok: true;
      readonly principal: AuthenticatedPrincipal;
    }
  | {
      readonly ok: false;
      readonly code: "AUTHENTICATION_REQUIRED" | "UNSAFE_REQUEST";
    };

export interface PasswordVerifier {
  verify(passwordHash: string, candidatePassword: string): Promise<boolean>;
}

export interface SessionTokenGenerator {
  generate(): string;
}

export interface SessionTokenHasher {
  hash(token: string): string;
}

/**
 * Server-only contract for the authentication vertical slice.
 *
 * Login must normalize the email, compare passwords through PasswordVerifier,
 * perform a dummy comparison for unknown accounts, and return the same
 * INVALID_CREDENTIALS result for malformed, unknown, and wrong credentials.
 * Raw session tokens exist only as server-side credentials/cookie values; only
 * their hashes are persisted. Sessions use a fixed absolute expiry.
 */
export interface AuthenticationSessionService {
  login(credentials: unknown): Promise<LoginResult>;

  authenticate(sessionToken: unknown): Promise<SessionAuthenticationResult>;

  /**
   * This is the authoritative service check. A route guard or redirect is only
   * a coarse UX measure and cannot replace this check at a protected boundary.
   */
  requireAuthenticatedAccount(
    sessionToken: unknown,
  ): Promise<SessionAuthenticationResult>;

  /**
   * Logout is idempotent, revokes only the presented session, and always
   * returns an expired current-session cookie after a handled request.
   */
  logout(sessionToken: unknown): Promise<LogoutResult>;

  /**
   * Cookie-authenticated unsafe methods require an exact trusted Origin match.
   * A present Sec-Fetch-Site value must also be "same-origin".
   */
  authorizeCookieMutation(
    requestEvidence: unknown,
  ): Promise<CookieMutationAuthorizationResult>;
}
