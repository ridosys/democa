-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('RETAIL', 'DINE_IN', 'TAKEAWAY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "type" "OrderType" NOT NULL DEFAULT 'RETAIL',
ADD COLUMN     "tableId" TEXT;

-- CreateIndex
CREATE INDEX "Order_tableId_idx" ON "Order"("tableId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce at most one open (PENDING/PROCESSING) order per table. Every
-- pre-migration row has tableId IS NULL and is excluded by the predicate,
-- so this can never reject existing data.
CREATE UNIQUE INDEX "Order_open_table_unique"
  ON "Order" ("tableId")
  WHERE "tableId" IS NOT NULL AND "status" IN ('PENDING', 'PROCESSING');
