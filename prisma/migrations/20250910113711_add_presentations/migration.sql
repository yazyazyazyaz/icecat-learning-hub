-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('RETAILERS', 'BRANDS');

-- CreateTable
CREATE TABLE "Presentation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "audience" "Audience" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Presentation_audience_updatedAt_idx" ON "Presentation"("audience", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Presentation_title_audience_key" ON "Presentation"("title", "audience");

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
