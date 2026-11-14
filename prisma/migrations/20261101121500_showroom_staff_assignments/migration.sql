-- P1-03 only. Apply to the isolated CI database; do not run against
-- staging/demo until P0 acceptance, backups and exact-head review approve it.
ALTER TABLE "Showroom" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "ShowroomStaffAssignment" (
    "id" TEXT NOT NULL,
    "showroomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShowroomStaffAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShowroomStaffAssignment_showroomId_userId_key"
    ON "ShowroomStaffAssignment"("showroomId", "userId");
CREATE INDEX "ShowroomStaffAssignment_userId_idx" ON "ShowroomStaffAssignment"("userId");
ALTER TABLE "ShowroomStaffAssignment"
    ADD CONSTRAINT "ShowroomStaffAssignment_showroomId_fkey"
    FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShowroomStaffAssignment"
    ADD CONSTRAINT "ShowroomStaffAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
