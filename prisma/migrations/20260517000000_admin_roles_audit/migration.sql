ALTER TABLE "users" ADD COLUMN "adminRole" TEXT;

UPDATE "users"
SET "adminRole" = 'SUPER_ADMIN'
WHERE "role" = 'ADMIN' AND "adminRole" IS NULL;
