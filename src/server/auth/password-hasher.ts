import "server-only";

import {
  argon2id,
  hash as createArgonHash,
  verify as verifyArgonHash,
} from "argon2";
import type { PasswordVerifier } from "@/server/auth/authentication.contract";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
}

export class Argon2PasswordHasher implements PasswordHasher, PasswordVerifier {
  hash(password: string): Promise<string> {
    return createArgonHash(password, { type: argon2id });
  }

  verify(passwordHash: string, candidatePassword: string): Promise<boolean> {
    return verifyArgonHash(passwordHash, candidatePassword);
  }
}
