CREATE TYPE "PaymentSandboxOutcome" AS ENUM ('APPROVED', 'DECLINED');

CREATE TABLE "PaymentSandboxAttempt" (
  "id" TEXT NOT NULL,
  "invoiceDraftId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "simulatorReference" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "outcome" "PaymentSandboxOutcome" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentSandboxAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentSandboxAttempt_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "PaymentSandboxAttempt_inr_only" CHECK ("currency" = 'INR')
);

CREATE UNIQUE INDEX "PaymentSandboxAttempt_idempotencyKey_key" ON "PaymentSandboxAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentSandboxAttempt_simulatorReference_key" ON "PaymentSandboxAttempt"("simulatorReference");
CREATE INDEX "PaymentSandboxAttempt_invoiceDraftId_createdAt_idx" ON "PaymentSandboxAttempt"("invoiceDraftId", "createdAt");
CREATE INDEX "PaymentSandboxAttempt_createdById_createdAt_idx" ON "PaymentSandboxAttempt"("createdById", "createdAt");

ALTER TABLE "PaymentSandboxAttempt" ADD CONSTRAINT "PaymentSandboxAttempt_invoiceDraftId_fkey"
  FOREIGN KEY ("invoiceDraftId") REFERENCES "SalesInvoiceDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentSandboxAttempt" ADD CONSTRAINT "PaymentSandboxAttempt_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
