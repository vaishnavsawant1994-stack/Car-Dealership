ALTER TYPE "UserRole" ADD VALUE 'PARTS_MANAGER';

CREATE TYPE "WorkshopPartRequestStatus" AS ENUM ('REQUESTED', 'ISSUED', 'CANCELLED');

CREATE TABLE "InventoryPart" (
  "id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'each',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryPart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartInventoryMovement" (
  "id" TEXT NOT NULL,
  "partId" TEXT NOT NULL,
  "showroomId" TEXT NOT NULL,
  "workshopOrderId" TEXT,
  "quantityDelta" DECIMAL(12,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "reference" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartInventoryMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartInventoryMovement_positive_delta_check" CHECK ("quantityDelta" <> 0)
);

CREATE TABLE "WorkshopPartRequest" (
  "id" TEXT NOT NULL,
  "workshopOrderId" TEXT NOT NULL,
  "partId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "status" "WorkshopPartRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "issuedAt" TIMESTAMP(3),
  "issuedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkshopPartRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkshopPartRequest_positive_quantity_check" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "InventoryPart_sku_key" ON "InventoryPart"("sku");
CREATE INDEX "InventoryPart_active_name_idx" ON "InventoryPart"("active", "name");
CREATE INDEX "PartInventoryMovement_showroomId_partId_createdAt_idx" ON "PartInventoryMovement"("showroomId", "partId", "createdAt");
CREATE INDEX "PartInventoryMovement_workshopOrderId_createdAt_idx" ON "PartInventoryMovement"("workshopOrderId", "createdAt");
CREATE INDEX "WorkshopPartRequest_workshopOrderId_status_createdAt_idx" ON "WorkshopPartRequest"("workshopOrderId", "status", "createdAt");
CREATE INDEX "WorkshopPartRequest_partId_status_idx" ON "WorkshopPartRequest"("partId", "status");

ALTER TABLE "PartInventoryMovement" ADD CONSTRAINT "PartInventoryMovement_partId_fkey" FOREIGN KEY ("partId") REFERENCES "InventoryPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartInventoryMovement" ADD CONSTRAINT "PartInventoryMovement_showroomId_fkey" FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartInventoryMovement" ADD CONSTRAINT "PartInventoryMovement_workshopOrderId_fkey" FOREIGN KEY ("workshopOrderId") REFERENCES "WorkshopOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartInventoryMovement" ADD CONSTRAINT "PartInventoryMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopPartRequest" ADD CONSTRAINT "WorkshopPartRequest_workshopOrderId_fkey" FOREIGN KEY ("workshopOrderId") REFERENCES "WorkshopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopPartRequest" ADD CONSTRAINT "WorkshopPartRequest_partId_fkey" FOREIGN KEY ("partId") REFERENCES "InventoryPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopPartRequest" ADD CONSTRAINT "WorkshopPartRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopPartRequest" ADD CONSTRAINT "WorkshopPartRequest_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
