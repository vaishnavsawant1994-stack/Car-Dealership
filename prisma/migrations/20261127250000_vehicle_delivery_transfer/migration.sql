CREATE TYPE "DeliveryCaseStatus" AS ENUM ('PREPARING', 'READY_FOR_HANDOVER', 'HANDED_OVER', 'CANCELLED');
CREATE TYPE "DeliveryChecklistCode" AS ENUM (
  'CLEARED_PAYMENT_VERIFIED', 'CUSTOMER_DOCUMENTS_CHECKED', 'VEHICLE_PREPARATION_COMPLETE',
  'INSURANCE_DOCUMENTS_READY', 'RC_TRANSFER_DOCUMENTS_READY'
);

CREATE TABLE "DeliveryCase" (
  "id" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "showroomId" TEXT,
  "assignedToId" TEXT,
  "createdById" TEXT NOT NULL,
  "status" "DeliveryCaseStatus" NOT NULL DEFAULT 'PREPARING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryChecklistEntry" (
  "id" TEXT NOT NULL,
  "deliveryCaseId" TEXT NOT NULL,
  "code" "DeliveryChecklistCode" NOT NULL,
  "completedAt" TIMESTAMP(3),
  "completedById" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "DeliveryChecklistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryCase_referenceNumber_key" ON "DeliveryCase"("referenceNumber");
CREATE UNIQUE INDEX "DeliveryCase_dealId_key" ON "DeliveryCase"("dealId");
CREATE UNIQUE INDEX "DeliveryChecklistEntry_deliveryCaseId_code_key" ON "DeliveryChecklistEntry"("deliveryCaseId", "code");
CREATE INDEX "DeliveryCase_showroomId_assignedToId_status_updatedAt_idx" ON "DeliveryCase"("showroomId", "assignedToId", "status", "updatedAt");
CREATE INDEX "DeliveryCase_vehicleId_status_idx" ON "DeliveryCase"("vehicleId", "status");
CREATE INDEX "DeliveryChecklistEntry_code_completedAt_idx" ON "DeliveryChecklistEntry"("code", "completedAt");
CREATE UNIQUE INDEX "DeliveryCase_one_active_per_vehicle" ON "DeliveryCase"("vehicleId") WHERE "status" IN ('PREPARING', 'READY_FOR_HANDOVER');

ALTER TABLE "DeliveryCase" ADD CONSTRAINT "DeliveryCase_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "SalesDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryCase" ADD CONSTRAINT "DeliveryCase_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryCase" ADD CONSTRAINT "DeliveryCase_showroomId_fkey" FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryCase" ADD CONSTRAINT "DeliveryCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryCase" ADD CONSTRAINT "DeliveryCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryChecklistEntry" ADD CONSTRAINT "DeliveryChecklistEntry_deliveryCaseId_fkey" FOREIGN KEY ("deliveryCaseId") REFERENCES "DeliveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryChecklistEntry" ADD CONSTRAINT "DeliveryChecklistEntry_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
