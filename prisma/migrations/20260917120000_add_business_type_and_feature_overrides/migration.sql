-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('RETAIL', 'CAFE');

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'RETAIL';

-- CreateTable
CREATE TABLE "FeatureOverride" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureOverride_key_key" ON "FeatureOverride"("key");

-- CreateIndex
CREATE INDEX "FeatureOverride_updatedById_idx" ON "FeatureOverride"("updatedById");

-- AddForeignKey
ALTER TABLE "FeatureOverride" ADD CONSTRAINT "FeatureOverride_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
