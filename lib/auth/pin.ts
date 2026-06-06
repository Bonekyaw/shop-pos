import bcrypt from "bcryptjs";

const PIN_REGEX = /^\d{4}$/;
const BCRYPT_ROUNDS = 10;

export function isValidPinFormat(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

/**
 * Compare input to stored value. Supports legacy plaintext PINs in DB (migrated on success).
 */
export async function verifyPin(
  stored: string,
  input: string,
): Promise<{ ok: boolean; migratedHash?: string }> {
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
    const ok = await bcrypt.compare(input, stored);
    return { ok };
  }
  if (stored === input) {
    const migratedHash = await hashPin(input);
    return { ok: true, migratedHash };
  }
  return { ok: false };
}
