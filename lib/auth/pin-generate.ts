import { findActiveUserByPin } from "./pin-login";

/**
 * Generate a unique random 4-digit PIN that is not in use by any active user.
 * Tries up to `maxAttempts` times before throwing.
 */
export async function generateUniquePin(maxAttempts = 100): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = Math.floor(1000 + Math.random() * 9000).toString();
    const existing = await findActiveUserByPin(candidate);
    if (!existing) {
      return candidate;
    }
  }
  throw new Error("Failed to generate a unique PIN after maximum attempts");
}
