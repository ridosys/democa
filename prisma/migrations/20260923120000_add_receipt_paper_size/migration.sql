-- Default paper size printed invoices (sales invoice, daily waiter invoice)
-- are laid out for: '58mm' | '80mm' | 'A5' | 'A4'. Can be overridden per
-- print with ?paper=. Additive only; existing rows get the 58mm default.
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "receiptPaperSize" TEXT NOT NULL DEFAULT '58mm';
