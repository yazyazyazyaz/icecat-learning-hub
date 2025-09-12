-- AlterTable: add profile-related fields to User
ALTER TABLE "User"
  ADD COLUMN "jobFunction" TEXT,
  ADD COLUMN "icecatBoUsername" TEXT,
  ADD COLUMN "icecatFoUsername" TEXT,
  ADD COLUMN "contentToken" TEXT,
  ADD COLUMN "accessToken" TEXT;

