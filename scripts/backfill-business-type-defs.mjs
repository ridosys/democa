import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// The exact values BUSINESS_TYPE_PRESETS held in code before this
// migration — seeded once as real, admin-editable FeatureDefault rows so
// existing installs see zero behavior change on cutover.
const SEED_PRESETS = {
  RETAIL: {
    name: "Retail",
    features: {
      OPEN_ORDERS: false,
      TABLES: false,
      PRODUCT_OPTIONS: false,
      QR_ORDERING: false,
      RETAIL_CAISSE: true,
      CAFE_CAISSE: false,
    },
  },
  CAFE: {
    name: "Cafe",
    features: {
      OPEN_ORDERS: true,
      TABLES: true,
      PRODUCT_OPTIONS: true,
      QR_ORDERING: true,
      RETAIL_CAISSE: false,
      CAFE_CAISSE: true,
    },
  },
};

async function main() {
  const idByKey = {};

  for (const [key, { name, features }] of Object.entries(SEED_PRESETS)) {
    const businessType = await prisma.businessTypeDef.upsert({
      where: { key },
      create: { key, name, isSystem: true },
      update: { isSystem: true },
    });
    idByKey[key] = businessType.id;

    for (const [featureKey, enabled] of Object.entries(features)) {
      await prisma.featureDefault.upsert({
        where: { businessTypeId_key: { businessTypeId: businessType.id, key: featureKey } },
        create: { businessTypeId: businessType.id, key: featureKey, enabled },
        update: {},
      });
    }
  }

  const settingsRows = await prisma.systemSettings.findMany({
    select: { id: true, businessType: true, businessTypeId: true },
  });
  for (const row of settingsRows) {
    if (row.businessTypeId) continue;
    const targetId = idByKey[row.businessType] ?? idByKey.RETAIL;
    await prisma.systemSettings.update({
      where: { id: row.id },
      data: { businessTypeId: targetId },
    });
  }

  console.log(`Seeded ${Object.keys(idByKey).length} business types, backfilled ${settingsRows.length} SystemSettings row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
