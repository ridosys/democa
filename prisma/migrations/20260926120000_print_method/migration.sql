-- One receipt printing method ("browser" | "thermer" | "escpos") replaces
-- the Bluetooth Print on/off switch; an enabled switch becomes "thermer".
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "printMethod" TEXT NOT NULL DEFAULT 'browser';
UPDATE "SystemSettings" SET "printMethod" = 'thermer' WHERE "bluetoothPrint" = true;
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "bluetoothPrint";
