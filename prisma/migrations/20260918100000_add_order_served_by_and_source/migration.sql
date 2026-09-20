-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('STAFF', 'QR');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'STAFF',
ADD COLUMN     "servedById" TEXT;

-- CreateIndex
CREATE INDEX "Order_servedById_idx" ON "Order"("servedById");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_servedById_fkey" FOREIGN KEY ("servedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
