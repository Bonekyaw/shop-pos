/**
 * One-time: create an ADMIN user if none exists.
 * Usage: ADMIN_PIN=1234 ADMIN_EMAIL=you@example.com ADMIN_NAME=Admin npx tsx scripts/bootstrap-admin.ts
 */
import "dotenv/config";
import prisma from "../lib/prisma";
import { hashPin, isValidPinFormat } from "../lib/auth/pin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const pin = process.env.ADMIN_PIN?.trim() ?? "";
  const name = process.env.ADMIN_NAME?.trim() ?? "Admin";
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";

  if (!isValidPinFormat(pin)) {
    console.error("Set ADMIN_PIN to exactly 4 digits.");
    process.exit(1);
  }

  if (!EMAIL_RE.test(email)) {
    console.error("Set ADMIN_EMAIL to the admin’s email (used for OTP sign-in).");
    process.exit(1);
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (existingAdmin) {
    console.log("An ADMIN user already exists. Skipping.");
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      emailVerified: true,
      pin: await hashPin(pin),
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
    },
  });

  console.log(`Created ADMIN user "${name}" (${email}).`);
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
