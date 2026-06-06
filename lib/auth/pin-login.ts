import prisma from "../prisma";
import { isValidPinFormat, verifyPin } from "./pin";

/**
 * PIN-only login: compare against active users (bcrypt or legacy plaintext).
 * On legacy match, PIN is re-hashed and stored.
 */
export async function findActiveUserByPin(pin: string) {
  if (!isValidPinFormat(pin)) {
    return null;
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      pin: true,
      createdAt: true,
    },
  });

  for (const u of users) {
    const { ok, migratedHash } = await verifyPin(u.pin, pin);
    if (ok) {
      if (migratedHash) {
        await prisma.user.update({
          where: { id: u.id },
          data: { pin: migratedHash },
        });
      }
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      };
    }
  }

  return null;
}
