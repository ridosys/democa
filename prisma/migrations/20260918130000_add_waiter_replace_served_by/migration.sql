-- CreateTable
CREATE TABLE "Waiter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Waiter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Waiter_createdById_idx" ON "Waiter"("createdById");

-- AddForeignKey
ALTER TABLE "Waiter" ADD CONSTRAINT "Waiter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Replace Order.servedById (Admin FK, added earlier this same feature
-- branch and never used in production) with Order.waiterId (Waiter FK) —
-- waiters are a distinct floor-staff directory, not Admin accounts.
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_servedById_fkey";
DROP INDEX IF EXISTS "Order_servedById_idx";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "servedById";

ALTER TABLE "Order" ADD COLUMN "waiterId" TEXT;
CREATE INDEX "Order_waiterId_idx" ON "Order"("waiterId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "Waiter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
