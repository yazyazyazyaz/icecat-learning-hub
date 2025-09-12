-- Create separate table for Documents
CREATE TABLE "DocumentFile" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

