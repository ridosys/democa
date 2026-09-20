-- CreateTable
CREATE TABLE "BusinessTypeDef" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTypeDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureDefault" (
    "id" TEXT NOT NULL,
    "businessTypeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureDefault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTypeDef_key_key" ON "BusinessTypeDef"("key");
CREATE INDEX "BusinessTypeDef_createdById_idx" ON "BusinessTypeDef"("createdById");
CREATE UNIQUE INDEX "FeatureDefault_businessTypeId_key_key" ON "FeatureDefault"("businessTypeId", "key");
CREATE INDEX "FeatureDefault_businessTypeId_idx" ON "FeatureDefault"("businessTypeId");

-- AddForeignKey
ALTER TABLE "BusinessTypeDef" ADD CONSTRAINT "BusinessTypeDef_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeatureDefault" ADD CONSTRAINT "FeatureDefault_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessTypeDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add the new reference column alongside the old enum column
ALTER TABLE "SystemSettings" ADD COLUMN "businessTypeId" TEXT;
ALTER TABLE "SystemSettings" ADD CONSTRAINT "SystemSettings_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessTypeDef"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration (see scripts/backfill-business-type-defs.mjs): seed
-- BusinessTypeDef{RETAIL,CAFE} + their FeatureDefault rows with the exact
-- values BUSINESS_TYPE_PRESETS held in code, then point every
-- SystemSettings row's new businessTypeId at the row matching its old
-- businessType enum value.

-- AlterTable: old enum column dropped once every row is backfilled
ALTER TABLE "SystemSettings" DROP COLUMN "businessType";

-- DropEnum
DROP TYPE "BusinessType";
