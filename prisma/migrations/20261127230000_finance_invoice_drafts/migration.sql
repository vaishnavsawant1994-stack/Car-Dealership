ALTER TYPE "UserRole" ADD VALUE 'FINANCE';

CREATE TYPE "SalesInvoiceDraftStatus" AS ENUM ('DRAFT', 'VOID');

CREATE TABLE "SalesInvoiceDraft" (
  "id" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "status" "SalesInvoiceDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "vehicleTitle" TEXT NOT NULL,
  "stockNumber" TEXT NOT NULL,
  "vehiclePrice" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL,
  "estimatedOtherFees" INTEGER NOT NULL,
  "estimatedSubtotal" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesInvoiceDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesInvoiceDraft_amounts_nonnegative" CHECK (
    "vehiclePrice" >= 0 AND "discountAmount" >= 0 AND "estimatedOtherFees" >= 0 AND "estimatedSubtotal" >= 0
  ),
  CONSTRAINT "SalesInvoiceDraft_amounts_consistent" CHECK (
    "discountAmount" <= "vehiclePrice" AND "estimatedSubtotal" = "vehiclePrice" - "discountAmount" + "estimatedOtherFees"
  ),
  CONSTRAINT "SalesInvoiceDraft_currency_inr" CHECK ("currency" = 'INR')
);

CREATE UNIQUE INDEX "SalesInvoiceDraft_referenceNumber_key" ON "SalesInvoiceDraft"("referenceNumber");
CREATE UNIQUE INDEX "SalesInvoiceDraft_dealId_key" ON "SalesInvoiceDraft"("dealId");
CREATE INDEX "SalesInvoiceDraft_status_createdAt_idx" ON "SalesInvoiceDraft"("status", "createdAt");
CREATE INDEX "SalesInvoiceDraft_createdById_createdAt_idx" ON "SalesInvoiceDraft"("createdById", "createdAt");

ALTER TABLE "SalesInvoiceDraft" ADD CONSTRAINT "SalesInvoiceDraft_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "SalesDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceDraft" ADD CONSTRAINT "SalesInvoiceDraft_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
