-- One design for every printed document replaces the per-document styles.
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "receiptStyle" TEXT NOT NULL DEFAULT 'classic';
UPDATE "SystemSettings" SET "receiptStyle" = "invoiceStyle";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "invoiceStyle";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "purchaseStyle";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "waiterReportStyle";
