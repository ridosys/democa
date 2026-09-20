-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "qrToken" TEXT,
ADD COLUMN     "qrEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qrTokenRotatedAt" TIMESTAMP(3);

-- CreateIndex
-- Every pre-migration row has qrToken IS NULL; a unique index permits any
-- number of NULLs in Postgres, so this can never reject existing data.
CREATE UNIQUE INDEX "Table_qrToken_key" ON "Table"("qrToken");
