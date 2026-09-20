import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// New FEATURE_KEYS added after business types moved into the database —
// without a seeded row, withDefaults() resolves a missing key to disabled,
// which would silently turn off Customers for every existing Retail
// install. Seed explicit values for the two seeded system types; any other
// (admin-created) business type gets both left off, same as every other
// feature it hasn't been given a row for yet — the admin can flip them on
// from the preset grid.
const SEED_VALUES = {
  RETAIL: { CUSTOMERS: true, WAITERS: false },
  CAFE: { CUSTOMERS: false, WAITERS: true },
};

async function main() {
  const businessTypes = await prisma.businessTypeDef.findMany();

  for (const businessType of businessTypes) {
    const values = SEED_VALUES[businessType.key] ?? {};
    for (const key of ["CUSTOMERS", "WAITERS"]) {
      const enabled = values[key] ?? false;
      await prisma.featureDefault.upsert({
        where: { businessTypeId_key: { businessTypeId: businessType.id, key } },
        create: { businessTypeId: businessType.id, key, enabled },
        update: {},
      });
    }
  }

  console.log(`Ensured CUSTOMERS/WAITERS FeatureDefault rows for ${businessTypes.length} business type(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
