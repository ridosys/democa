-- Sales and purchase invoice styles, picked in Settings → Printing.
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "invoiceStyle" TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "purchaseStyle" TEXT NOT NULL DEFAULT 'classic';
