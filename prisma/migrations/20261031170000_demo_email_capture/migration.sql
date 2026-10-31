-- P0-05: independent encrypted demo mail outbox (never a real delivery queue).
CREATE TABLE "CapturedEmail" (
  "id" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "recipientHash" TEXT NOT NULL,
  "encryptedPayload" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "authTag" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "viewedAt" TIMESTAMP(3),
  CONSTRAINT "CapturedEmail_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CapturedEmail_environment_createdAt_idx" ON "CapturedEmail"("environment", "createdAt");
CREATE INDEX "CapturedEmail_expiresAt_idx" ON "CapturedEmail"("expiresAt");
