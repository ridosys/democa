-- Print defaults (text size, language) and the waiter invoice style,
-- picked in Settings → Printing.
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "receiptTextSize" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "receiptLanguage" TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "waiterReportStyle" TEXT NOT NULL DEFAULT 'classic';
