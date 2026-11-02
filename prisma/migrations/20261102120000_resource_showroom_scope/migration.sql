-- P1-05: associate operational records with the existing showroom/branch.
-- Nullable columns allow a clean database to migrate before the seed creates
-- the primary showroom. Existing data is backfilled whenever one exists.
ALTER TABLE "Vehicle" ADD COLUMN "showroomId" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN "showroomId" TEXT;
ALTER TABLE "TestDrive" ADD COLUMN "showroomId" TEXT;
ALTER TABLE "SellRequest" ADD COLUMN "showroomId" TEXT;
ALTER TABLE "ContactMessage" ADD COLUMN "showroomId" TEXT;

DO $$
DECLARE primary_showroom_id TEXT;
BEGIN
  SELECT "id" INTO primary_showroom_id
  FROM "Showroom"
  WHERE "isPrimary" = true AND "active" = true
  ORDER BY "createdAt", "id"
  LIMIT 1;

  IF primary_showroom_id IS NULL AND (
    EXISTS (SELECT 1 FROM "Vehicle") OR
    EXISTS (SELECT 1 FROM "Inquiry") OR
    EXISTS (SELECT 1 FROM "TestDrive") OR
    EXISTS (SELECT 1 FROM "SellRequest") OR
    EXISTS (SELECT 1 FROM "ContactMessage")
  ) THEN
    RAISE EXCEPTION 'P1-05 requires an active primary showroom before existing records can be scoped';
  END IF;

  IF primary_showroom_id IS NOT NULL THEN
    UPDATE "Vehicle" SET "showroomId" = primary_showroom_id WHERE "showroomId" IS NULL;
    UPDATE "Inquiry" SET "showroomId" = primary_showroom_id WHERE "showroomId" IS NULL;
    UPDATE "TestDrive" SET "showroomId" = primary_showroom_id WHERE "showroomId" IS NULL;
    UPDATE "SellRequest" SET "showroomId" = primary_showroom_id WHERE "showroomId" IS NULL;
    UPDATE "ContactMessage" SET "showroomId" = primary_showroom_id WHERE "showroomId" IS NULL;
  END IF;
END $$;

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_showroomId_fkey" FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_showroomId_fkey" FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestDrive" ADD CONSTRAINT "TestDrive_showroomId_fkey" FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellRequest" ADD CONSTRAINT "SellRequest_showroomId_fkey" FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_showroomId_fkey" FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Vehicle_showroomId_status_published_idx" ON "Vehicle"("showroomId", "status", "published");
CREATE INDEX "Inquiry_showroomId_assignedToId_submittedAt_idx" ON "Inquiry"("showroomId", "assignedToId", "submittedAt");
CREATE INDEX "TestDrive_showroomId_assignedToId_submittedAt_idx" ON "TestDrive"("showroomId", "assignedToId", "submittedAt");
CREATE INDEX "SellRequest_showroomId_assignedToId_createdAt_idx" ON "SellRequest"("showroomId", "assignedToId", "createdAt");
CREATE INDEX "ContactMessage_showroomId_assignedToId_createdAt_idx" ON "ContactMessage"("showroomId", "assignedToId", "createdAt");
