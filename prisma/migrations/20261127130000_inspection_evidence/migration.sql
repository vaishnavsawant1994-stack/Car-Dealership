CREATE TABLE "VehicleInspectionEvidence" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "checkCode" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleInspectionEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleInspectionEvidence_storageKey_key" ON "VehicleInspectionEvidence"("storageKey");
CREATE UNIQUE INDEX "VehicleInspectionEvidence_inspectionId_checksum_key" ON "VehicleInspectionEvidence"("inspectionId", "checksum");
CREATE INDEX "VehicleInspectionEvidence_inspectionId_checkCode_createdAt_idx" ON "VehicleInspectionEvidence"("inspectionId", "checkCode", "createdAt");

ALTER TABLE "VehicleInspectionEvidence" ADD CONSTRAINT "VehicleInspectionEvidence_inspectionId_fkey"
  FOREIGN KEY ("inspectionId") REFERENCES "VehicleInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInspectionEvidence" ADD CONSTRAINT "VehicleInspectionEvidence_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
