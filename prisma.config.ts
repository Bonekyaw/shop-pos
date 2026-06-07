import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// SQLite file URL; path is relative to the project root when using `file:./...` from .env.
// See https://www.prisma.io/docs/prisma-orm/quickstart/sqlite
const databaseUrl = env("DATABASE_URL") ?? "file:./prisma/dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
