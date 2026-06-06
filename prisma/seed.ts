import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminEmail = "phonenai2014@gmail.com";
  const adminPin = "1234"; // Default PIN
  const hashedPin = await bcrypt.hash(adminPin, 10);

  console.log(`Seeding database...`);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: "Super Admin",
      pin: hashedPin,
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`Admin user created/updated: ${admin.email}`);
  console.log(`Default PIN: ${adminPin}`);
  console.log(`Database seeding completed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
