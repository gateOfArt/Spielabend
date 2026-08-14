import "server-only";

import { argon2id, hash as createArgonHash } from "argon2";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
}

export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return createArgonHash(password, { type: argon2id });
  }
}
