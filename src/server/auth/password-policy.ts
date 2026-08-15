import "server-only";

export const PASSWORD_LENGTH_POLICY = Object.freeze({
  minimum: 12,
  maximum: 128,
} as const);

export function passwordCharacterLength(password: string): number {
  return Array.from(password).length;
}

export function hasAllowedPasswordLength(password: string): boolean {
  const length = passwordCharacterLength(password);

  return (
    length >= PASSWORD_LENGTH_POLICY.minimum &&
    length <= PASSWORD_LENGTH_POLICY.maximum
  );
}
