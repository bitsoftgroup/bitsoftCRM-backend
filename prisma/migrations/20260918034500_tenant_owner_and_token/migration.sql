-- Adds owner identity fields (used on the Contracts page) and a per-center
-- tenant token hash (used to authenticate the exported desktop app against
-- the shared backend) to EducationCenter. All columns are nullable additions
-- to an existing table, so this is purely additive and carries no data-loss risk.

ALTER TABLE "EducationCenter" ADD COLUMN "ownerName" TEXT;
ALTER TABLE "EducationCenter" ADD COLUMN "ownerPhone" TEXT;
ALTER TABLE "EducationCenter" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "EducationCenter" ADD COLUMN "tenantTokenHash" TEXT;

CREATE UNIQUE INDEX "EducationCenter_tenantTokenHash_key" ON "EducationCenter"("tenantTokenHash");
