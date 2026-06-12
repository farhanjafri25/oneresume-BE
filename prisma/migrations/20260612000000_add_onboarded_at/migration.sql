-- AlterTable
ALTER TABLE "users" ADD COLUMN "onboardedAt" TIMESTAMP(3);

-- Backfill: anyone who has already used the product (≥1 resume) is treated as
-- already onboarded, using their account creation time as the onboarding moment.
UPDATE "users"
SET "onboardedAt" = "createdAt"
WHERE "onboardedAt" IS NULL
  AND EXISTS (SELECT 1 FROM "resumes" WHERE "resumes"."userId" = "users"."id");
