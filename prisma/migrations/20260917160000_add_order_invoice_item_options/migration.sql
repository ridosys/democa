-- CreateTable
CREATE TABLE "OrderItemOption" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "priceAdjustment" DECIMAL(12,4) NOT NULL,
    "optionId" TEXT,

    CONSTRAINT "OrderItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItemOption" (
    "id" TEXT NOT NULL,
    "invoiceItemId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "priceAdjustment" DECIMAL(12,4) NOT NULL,
    "optionId" TEXT,

    CONSTRAINT "InvoiceItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItemOption_orderItemId_idx" ON "OrderItemOption"("orderItemId");
CREATE INDEX "OrderItemOption_optionId_idx" ON "OrderItemOption"("optionId");
CREATE INDEX "InvoiceItemOption_invoiceItemId_idx" ON "InvoiceItemOption"("invoiceItemId");
CREATE INDEX "InvoiceItemOption_optionId_idx" ON "InvoiceItemOption"("optionId");

-- AddForeignKey
ALTER TABLE "OrderItemOption" ADD CONSTRAINT "OrderItemOption_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItemOption" ADD CONSTRAINT "OrderItemOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceItemOption" ADD CONSTRAINT "InvoiceItemOption_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceItemOption" ADD CONSTRAINT "InvoiceItemOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
