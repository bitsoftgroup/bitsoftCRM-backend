-- New table only: tracks background builds of each center's branded desktop .exe.
CREATE TYPE "ExportJobStatus" AS ENUM ('pending', 'building', 'done', 'failed');

CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "educationCenterId" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'pending',
    "filePath" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExportJob_educationCenterId_createdAt_idx" ON "ExportJob"("educationCenterId", "createdAt");

ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
