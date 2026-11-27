CREATE TYPE "SalesDealStatus" AS ENUM ('OPEN', 'NEGOTIATION', 'WON', 'LOST', 'CANCELLED');
CREATE TYPE "SalesDealAcceptanceMethod" AS ENUM ('SIGNED_ORDER_FORM', 'CUSTOMER_EMAIL', 'IN_PERSON_CONFIRMATION');
CREATE TYPE "SalesDealLossReason" AS ENUM ('CUSTOMER_DECLINED', 'PURCHASED_ELSEWHERE', 'FINANCING_NOT_READY', 'VEHICLE_UNAVAILABLE', 'NO_RESPONSE', 'DUPLICATE', 'OTHER');

CREATE TABLE "SalesDeal" (
  "id" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "quoteDraftId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "showroomId" TEXT,
  "assignedToId" TEXT,
  "createdById" TEXT NOT NULL,
  "status" "SalesDealStatus" NOT NULL DEFAULT 'OPEN',
  "version" INTEGER NOT NULL DEFAULT 1,
  "acceptanceMethod" "SalesDealAcceptanceMethod",
  "lossReason" "SalesDealLossReason",
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesDeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesDealEvent" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "fromStatus" "SalesDealStatus",
  "toStatus" "SalesDealStatus" NOT NULL,
  "acceptanceMethod" "SalesDealAcceptanceMethod",
  "lossReason" "SalesDealLossReason",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesDealEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesDeal_referenceNumber_key" ON "SalesDeal"("referenceNumber");
CREATE UNIQUE INDEX "SalesDeal_quoteDraftId_key" ON "SalesDeal"("quoteDraftId");
CREATE UNIQUE INDEX "SalesDeal_active_inquiry_key" ON "SalesDeal"("inquiryId")
  WHERE "status" IN ('OPEN', 'NEGOTIATION', 'WON');
CREATE INDEX "SalesDeal_showroomId_assignedToId_status_updatedAt_idx"
  ON "SalesDeal"("showroomId", "assignedToId", "status", "updatedAt");
CREATE INDEX "SalesDeal_vehicleId_status_idx" ON "SalesDeal"("vehicleId", "status");
CREATE INDEX "SalesDeal_inquiryId_createdAt_idx" ON "SalesDeal"("inquiryId", "createdAt");
CREATE INDEX "SalesDealEvent_dealId_createdAt_idx" ON "SalesDealEvent"("dealId", "createdAt");

ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_inquiryId_fkey"
  FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_quoteDraftId_fkey"
  FOREIGN KEY ("quoteDraftId") REFERENCES "SalesQuoteDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_showroomId_fkey"
  FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesDealEvent" ADD CONSTRAINT "SalesDealEvent_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "SalesDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesDealEvent" ADD CONSTRAINT "SalesDealEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
