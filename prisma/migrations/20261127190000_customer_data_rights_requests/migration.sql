CREATE TYPE "CustomerDataRightsKind" AS ENUM ('ACCESS', 'RECTIFICATION', 'ERASURE');
CREATE TYPE "CustomerDataRightsStatus" AS ENUM ('PENDING_ID_VERIFICATION', 'UNDER_MANUAL_REVIEW', 'RESOLVED', 'REJECTED');

CREATE TABLE "CustomerDataRightsRequest" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "kind" "CustomerDataRightsKind" NOT NULL,
  "status" "CustomerDataRightsStatus" NOT NULL DEFAULT 'PENDING_ID_VERIFICATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerDataRightsRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerDataRightsRequest_customerId_createdAt_idx"
  ON "CustomerDataRightsRequest"("customerId", "createdAt");
CREATE INDEX "CustomerDataRightsRequest_status_createdAt_idx"
  ON "CustomerDataRightsRequest"("status", "createdAt");
-- Prevent duplicate unresolved requests, including under concurrent operators.
CREATE UNIQUE INDEX "CustomerDataRightsRequest_open_customer_kind_key"
  ON "CustomerDataRightsRequest"("customerId", "kind")
  WHERE "status" IN ('PENDING_ID_VERIFICATION','UNDER_MANUAL_REVIEW');

ALTER TABLE "CustomerDataRightsRequest" ADD CONSTRAINT "CustomerDataRightsRequest_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerDataRightsRequest" ADD CONSTRAINT "CustomerDataRightsRequest_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
