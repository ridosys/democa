import "server-only";
import { prisma } from "@/lib/prisma";
import { getSystemSettingsRow } from "@/features/settings/queries";
import {
  FEATURE_KEYS,
  resolveFeatures,
  withDefaults,
  type FeatureKey,
} from "@/lib/feature-catalog";

export type BusinessTypeRow = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
};

export async function getActiveBusinessType(): Promise<BusinessTypeRow | null> {
  const settingsRow = await getSystemSettingsRow();
  if (settingsRow?.businessTypeId) {
    const businessType = await prisma.businessTypeDef.findUnique({
      where: { id: settingsRow.businessTypeId },
    });
    if (businessType) return businessType;
  }
  return prisma.businessTypeDef.findUnique({ where: { key: "RETAIL" } });
}

export async function getAllBusinessTypes(): Promise<BusinessTypeRow[]> {
  return prisma.businessTypeDef.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getFeatureDefaultsFor(
  businessTypeId: string,
): Promise<Record<FeatureKey, boolean>> {
  const rows = await prisma.featureDefault.findMany({
    where: { businessTypeId },
  });
  const partial: Partial<Record<FeatureKey, boolean>> = {};
  for (const row of rows) {
    if ((FEATURE_KEYS as readonly string[]).includes(row.key)) {
      partial[row.key as FeatureKey] = row.enabled;
    }
  }
  return withDefaults(partial);
}

export type FeatureRow = {
  key: FeatureKey;
  enabled: boolean;
  isOverridden: boolean;
};

export async function getBusinessSettingsView(): Promise<{
  businessTypes: BusinessTypeRow[];
  activeBusinessTypeId: string | null;
  features: FeatureRow[];
  presetsByBusinessType: Record<string, Record<FeatureKey, boolean>>;
}> {
  const businessTypes = await getAllBusinessTypes();
  const [activeBusinessType, overrideRows, presetEntries] = await Promise.all([
    getActiveBusinessType(),
    prisma.featureOverride.findMany({ select: { key: true, enabled: true } }),
    Promise.all(
      businessTypes.map(
        async (bt) => [bt.id, await getFeatureDefaultsFor(bt.id)] as const,
      ),
    ),
  ]);

  const overriddenKeys = new Set(overrideRows.map((row) => row.key));
  const overrides: Partial<Record<FeatureKey, boolean>> = {};
  for (const row of overrideRows) {
    if ((FEATURE_KEYS as readonly string[]).includes(row.key)) {
      overrides[row.key as FeatureKey] = row.enabled;
    }
  }

  const presetsByBusinessType = Object.fromEntries(presetEntries);
  const activePreset = activeBusinessType
    ? (presetsByBusinessType[activeBusinessType.id] ?? withDefaults({}))
    : withDefaults({});
  const resolved = resolveFeatures(activePreset, overrides);

  return {
    businessTypes,
    activeBusinessTypeId: activeBusinessType?.id ?? null,
    features: FEATURE_KEYS.map((key) => ({
      key,
      enabled: resolved[key],
      isOverridden: overriddenKeys.has(key),
    })),
    presetsByBusinessType,
  };
}
