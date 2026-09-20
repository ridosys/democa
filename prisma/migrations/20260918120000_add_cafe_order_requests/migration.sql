-- CreateEnum
CREATE TYPE "CafeOrderRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "CafeOrderRequest" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" "CafeOrderRequestStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "notes" TEXT,
    "total" DECIMAL(10,2) NOT NULL,
    "acceptedOrderId" TEXT,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CafeOrderRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeOrderRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "CafeOrderRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeOrderRequestItemOption" (
    "id" TEXT NOT NULL,
    "requestItemId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "priceAdjustment" DECIMAL(12,4) NOT NULL,
    "optionId" TEXT,

    CONSTRAINT "CafeOrderRequestItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CafeOrderRequest_idempotencyKey_key" ON "CafeOrderRequest"("idempotencyKey");
CREATE INDEX "CafeOrderRequest_tableId_idx" ON "CafeOrderRequest"("tableId");
CREATE INDEX "CafeOrderRequest_status_idx" ON "CafeOrderRequest"("status");
CREATE INDEX "CafeOrderRequestItem_requestId_idx" ON "CafeOrderRequestItem"("requestId");
CREATE INDEX "CafeOrderRequestItem_productId_idx" ON "CafeOrderRequestItem"("productId");
CREATE INDEX "CafeOrderRequestItemOption_requestItemId_idx" ON "CafeOrderRequestItemOption"("requestItemId");
CREATE INDEX "CafeOrderRequestItemOption_optionId_idx" ON "CafeOrderRequestItemOption"("optionId");

-- AddForeignKey
ALTER TABLE "CafeOrderRequest" ADD CONSTRAINT "CafeOrderRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CafeOrderRequest" ADD CONSTRAINT "CafeOrderRequest_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CafeOrderRequestItem" ADD CONSTRAINT "CafeOrderRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CafeOrderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CafeOrderRequestItem" ADD CONSTRAINT "CafeOrderRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CafeOrderRequestItemOption" ADD CONSTRAINT "CafeOrderRequestItemOption_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "CafeOrderRequestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CafeOrderRequestItemOption" ADD CONSTRAINT "CafeOrderRequestItemOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
