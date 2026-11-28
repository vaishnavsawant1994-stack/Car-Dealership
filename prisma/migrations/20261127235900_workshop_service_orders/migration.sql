ALTER TYPE "UserRole" ADD VALUE 'WORKSHOP';

CREATE TYPE "WorkshopJobType" AS ENUM ('SERVICE', 'REPAIR', 'DIAGNOSTIC');
CREATE TYPE "WorkshopOrderStatus" AS ENUM ('OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "WorkshopChecklistCode" AS ENUM (
  'INTAKE_INSPECTION_COMPLETE', 'DIAGNOSIS_RECORDED', 'SERVICE_WORK_COMPLETE', 'SAFETY_REVIEW_COMPLETE'
);

CREATE TABLE "WorkshopOrder" (
  "id" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "showroomId" TEXT,
  "assignedToId" TEXT,
  "createdById" TEXT NOT NULL,
  "jobType" "WorkshopJobType" NOT NULL,
  "status" "WorkshopOrderStatus" NOT NULL DEFAULT 'OPEN',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkshopOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopChecklistEntry" (
  "id" TEXT NOT NULL,
  "workshopOrderId" TEXT NOT NULL,
  "code" "WorkshopChecklistCode" NOT NULL,
  "completedAt" TIMESTAMP(3),
  "completedById" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "WorkshopChecklistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkshopOrder_referenceNumber_key" ON "WorkshopOrder"("referenceNumber");
CREATE UNIQUE INDEX "WorkshopChecklistEntry_workshopOrderId_code_key" ON "WorkshopChecklistEntry"("workshopOrderId", "code");
CREATE INDEX "WorkshopOrder_showroomId_assignedToId_status_updatedAt_idx" ON "WorkshopOrder"("showroomId", "assignedToId", "status", "updatedAt");
CREATE INDEX "WorkshopOrder_vehicleId_status_idx" ON "WorkshopOrder"("vehicleId", "status");
CREATE INDEX "WorkshopChecklistEntry_code_completedAt_idx" ON "WorkshopChecklistEntry"("code", "completedAt");
CREATE UNIQUE INDEX "WorkshopOrder_one_active_per_vehicle" ON "WorkshopOrder"("vehicleId") WHERE "status" IN ('OPEN', 'SCHEDULED', 'IN_PROGRESS');

ALTER TABLE "WorkshopOrder" ADD CONSTRAINT "WorkshopOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopOrder" ADD CONSTRAINT "WorkshopOrder_showroomId_fkey" FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopOrder" ADD CONSTRAINT "WorkshopOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkshopOrder" ADD CONSTRAINT "WorkshopOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopChecklistEntry" ADD CONSTRAINT "WorkshopChecklistEntry_workshopOrderId_fkey" FOREIGN KEY ("workshopOrderId") REFERENCES "WorkshopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopChecklistEntry" ADD CONSTRAINT "WorkshopChecklistEntry_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
