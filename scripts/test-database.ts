import "dotenv/config";
import prisma from "../lib/prisma";
import { hashPin } from "../lib/auth/pin";

const TEST_USER_NAME = "Database connectivity test";

async function testDatabase() {
  console.log("Testing Prisma SQLite connection...\n");

  try {
    await prisma.$connect();
    console.log("Connected to database.\n");

    console.log("Creating a test staff user...");
    const created = await prisma.user.create({
      data: {
        name: TEST_USER_NAME,
        pin: await hashPin("9999"),
        role: "WAITER",
      },
    });
    console.log("Created user:", {
      id: created.id,
      name: created.name,
      role: created.role,
    });

    console.log("\nFetching staff users (excluding PIN)...");
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(`Found ${allUsers.length} user(s).`);

    await prisma.user.deleteMany({ where: { name: TEST_USER_NAME } });
    console.log("\nRemoved test user.\n");
    console.log("All checks passed.\n");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void testDatabase();
