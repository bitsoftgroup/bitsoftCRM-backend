-- Hand-written migration: introduces multi-tenancy (EducationCenter, SuperAdmin) and
-- backfills every existing table's new educationCenterId column onto one default
-- EducationCenter ('bitsoft'), so the real data already imported from Firebase is
-- preserved rather than reset. `prisma migrate dev` cannot generate this automatically
-- because it involves adding required columns to tables that already have rows.

-- CreateTable EducationCenter
CREATE TABLE "EducationCenter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationCenter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EducationCenter_slug_key" ON "EducationCenter"("slug");

-- CreateTable SuperAdmin
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- Seed the one EducationCenter that owns every row imported before multi-tenancy existed.
INSERT INTO "EducationCenter" ("id", "name", "slug", "isActive", "createdAt")
VALUES ('ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00', 'BitSoft', 'bitsoft', true, CURRENT_TIMESTAMP);

-- Add educationCenterId (nullable first, so existing rows survive), backfill, then tighten.
ALTER TABLE "Teacher" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "Course" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "Group" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "Student" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "Contract" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "Contract" ADD COLUMN "centerLogoUrl" TEXT;
ALTER TABLE "CashExpense" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "User" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "ContractYearCounter" ADD COLUMN "educationCenterId" TEXT;
ALTER TABLE "Settings" ADD COLUMN "educationCenterId" TEXT;

UPDATE "Teacher" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "Course" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "Group" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "Student" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "Payment" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "Attendance" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "Contract" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "CashExpense" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "User" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "ContractYearCounter" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';
UPDATE "Settings" SET "educationCenterId" = 'ddb7d997-4d09-4e0f-9d0e-ce406fcfcb00';

ALTER TABLE "Teacher" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "Group" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "Attendance" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "Contract" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "CashExpense" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "ContractYearCounter" ALTER COLUMN "educationCenterId" SET NOT NULL;
ALTER TABLE "Settings" ALTER COLUMN "educationCenterId" SET NOT NULL;

-- Foreign keys to EducationCenter
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Group" ADD CONSTRAINT "Group_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractYearCounter" ADD CONSTRAINT "ContractYearCounter_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_educationCenterId_fkey" FOREIGN KEY ("educationCenterId") REFERENCES "EducationCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Helpful indexes (mirrors the @@index([educationCenterId, name]) additions in schema.prisma)
CREATE INDEX "Teacher_educationCenterId_name_idx" ON "Teacher"("educationCenterId", "name");
CREATE INDEX "Course_educationCenterId_name_idx" ON "Course"("educationCenterId", "name");
CREATE INDEX "Group_educationCenterId_name_idx" ON "Group"("educationCenterId", "name");
CREATE INDEX "Student_educationCenterId_name_idx" ON "Student"("educationCenterId", "name");
CREATE INDEX "Payment_educationCenterId_studentId_groupId_month_idx" ON "Payment"("educationCenterId", "studentId", "groupId", "month");

-- Uniqueness moves from global to per-tenant: drop the old global uniques, add compound ones.
DROP INDEX "User_email_key";
CREATE UNIQUE INDEX "User_educationCenterId_email_key" ON "User"("educationCenterId", "email");

DROP INDEX "Contract_contractNumber_key";
CREATE UNIQUE INDEX "Contract_educationCenterId_contractNumber_key" ON "Contract"("educationCenterId", "contractNumber");

-- ContractYearCounter's primary key becomes (educationCenterId, year) instead of just (year).
ALTER TABLE "ContractYearCounter" DROP CONSTRAINT "ContractYearCounter_pkey";
ALTER TABLE "ContractYearCounter" ADD CONSTRAINT "ContractYearCounter_pkey" PRIMARY KEY ("educationCenterId", "year");

-- Settings' primary key moves from the fixed "singleton" id to educationCenterId itself,
-- since each tenant now has exactly one Settings row (a real 1:1 with EducationCenter).
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_pkey";
ALTER TABLE "Settings" DROP COLUMN "id";
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_pkey" PRIMARY KEY ("educationCenterId");
