import { verify } from "argon2";
import { describe, expect, it } from "vitest";
import { Argon2PasswordHasher } from "@/server/auth/password-hasher";

describe("Argon2 password hasher", () => {
  it("creates a verifiable Argon2id hash without embedding plaintext", async () => {
    const password = "correct horse battery staple";
    const passwordHasher = new Argon2PasswordHasher();

    const passwordHash = await passwordHasher.hash(password);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toContain(password);
    await expect(verify(passwordHash, password)).resolves.toBe(true);
    await expect(passwordHasher.verify(passwordHash, password)).resolves.toBe(
      true,
    );
    await expect(
      passwordHasher.verify(passwordHash, "wrong password"),
    ).resolves.toBe(false);
  });
});
