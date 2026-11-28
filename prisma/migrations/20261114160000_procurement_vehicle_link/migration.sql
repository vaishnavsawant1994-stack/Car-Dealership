-- P2-03: A seller intake may produce at most one unpublished inventory draft.
-- No historical SellRequest is backfilled or altered.
ALTER TABLE "Vehicle" ADD COLUMN "procurementRequestId" TEXT;

CREATE UNIQUE INDEX "Vehicle_procurementRequestId_key" ON "Vehicle"("procurementRequestId");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_procurementRequestId_fkey"
    FOREIGN KEY ("procurementRequestId") REFERENCES "SellRequest"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
