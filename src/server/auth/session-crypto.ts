import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  SESSION_POLICY,
  type SessionTokenGenerator,
  type SessionTokenHasher,
} from "@/server/auth/authentication.contract";

export class OpaqueSessionTokenGenerator implements SessionTokenGenerator {
  generate(): string {
    return randomBytes(SESSION_POLICY.tokenEntropyBytes).toString("base64url");
  }
}

export class Sha256SessionTokenHasher implements SessionTokenHasher {
  hash(token: string): string {
    return createHash(SESSION_POLICY.tokenStorageHash)
      .update(token, "utf8")
      .digest("base64url");
  }
}
