CREATE TABLE "SalesQuoteDraft" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "vehiclePrice" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "estimatedOtherFees" INTEGER NOT NULL DEFAULT 0,
  "estimatedSubtotal" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesQuoteDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SalesQuoteDraft_inquiryId_createdAt_idx" ON "SalesQuoteDraft"("inquiryId", "createdAt");
CREATE INDEX "SalesQuoteDraft_vehicleId_createdAt_idx" ON "SalesQuoteDraft"("vehicleId", "createdAt");

ALTER TABLE "SalesQuoteDraft" ADD CONSTRAINT "SalesQuoteDraft_inquiryId_fkey"
  FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesQuoteDraft" ADD CONSTRAINT "SalesQuoteDraft_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesQuoteDraft" ADD CONSTRAINT "SalesQuoteDraft_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
