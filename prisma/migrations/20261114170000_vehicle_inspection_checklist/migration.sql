CREATE TYPE "VehicleInspectionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "VehicleCheckResult" AS ENUM ('NOT_CHECKED', 'PASS', 'FAIL', 'NOT_APPLICABLE');

CREATE TABLE "VehicleInspection" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "inspectorId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "status" "VehicleInspectionStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "reviewNote" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleInspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleInspectionCheck" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "result" "VehicleCheckResult" NOT NULL DEFAULT 'NOT_CHECKED',
  "remarks" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleInspectionCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleInspectionCheck_inspectionId_code_key" ON "VehicleInspectionCheck"("inspectionId", "code");
CREATE INDEX "VehicleInspection_vehicleId_createdAt_idx" ON "VehicleInspection"("vehicleId", "createdAt");
CREATE INDEX "VehicleInspection_inspectorId_status_idx" ON "VehicleInspection"("inspectorId", "status");
CREATE INDEX "VehicleInspection_status_updatedAt_idx" ON "VehicleInspection"("status", "updatedAt");
CREATE INDEX "VehicleInspectionCheck_category_idx" ON "VehicleInspectionCheck"("category");

-- Historic approved/rejected inspections are retained, but only one inspection
-- per vehicle may remain in an editable or review-pending state concurrently.
CREATE UNIQUE INDEX "VehicleInspection_one_open_per_vehicle_idx" ON "VehicleInspection"("vehicleId")
  WHERE "status" IN ('DRAFT','IN_PROGRESS','READY_FOR_REVIEW');

ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_inspectorId_fkey"
  FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleInspectionCheck" ADD CONSTRAINT "VehicleInspectionCheck_inspectionId_fkey"
  FOREIGN KEY ("inspectionId") REFERENCES "VehicleInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
