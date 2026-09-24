-- Opt-in Android "Bluetooth Print" app integration for thermal receipts.
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "bluetoothPrint" BOOLEAN NOT NULL DEFAULT false;
