CREATE TYPE "AfterSalesTaskType" AS ENUM ('FIRST_SERVICE', 'WARRANTY_CHECK_IN', 'DOCUMENTS_CONFIRMATION', 'CUSTOMER_FEEDBACK');
CREATE TYPE "AfterSalesTaskStatus" AS ENUM ('OPEN', 'COMPLETED');

CREATE TABLE "AfterSalesTask" (
  "id" TEXT NOT NULL,
  "deliveryCaseId" TEXT NOT NULL,
  "showroomId" TEXT NOT NULL,
  "type" "AfterSalesTaskType" NOT NULL,
  "status" "AfterSalesTaskStatus" NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "assignedToId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AfterSalesTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AfterSalesTask_deliveryCaseId_type_dueAt_key" ON "AfterSalesTask"("deliveryCaseId", "type", "dueAt");
CREATE INDEX "AfterSalesTask_showroomId_status_dueAt_idx" ON "AfterSalesTask"("showroomId", "status", "dueAt");
CREATE INDEX "AfterSalesTask_assignedToId_dueAt_idx" ON "AfterSalesTask"("assignedToId", "dueAt");

ALTER TABLE "AfterSalesTask" ADD CONSTRAINT "AfterSalesTask_deliveryCaseId_fkey" FOREIGN KEY ("deliveryCaseId") REFERENCES "DeliveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AfterSalesTask" ADD CONSTRAINT "AfterSalesTask_showroomId_fkey" FOREIGN KEY ("showroomId") REFERENCES "Showroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AfterSalesTask" ADD CONSTRAINT "AfterSalesTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AfterSalesTask" ADD CONSTRAINT "AfterSalesTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
