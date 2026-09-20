import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getActiveBusinessType,
  getFeatureDefaultsFor,
} from "@/features/business/queries";
import { getDictionary } from "@/i18n/server";
import {
  FEATURE_KEYS,
  resolveFeatures,
  withDefaults,
  type FeatureKey,
} from "@/lib/feature-catalog";

export const getEffectiveFeatures = cache(
  async (): Promise<Record<FeatureKey, boolean>> => {
    const [activeBusinessType, overrideRows] = await Promise.all([
      getActiveBusinessType(),
      prisma.featureOverride.findMany({ select: { key: true, enabled: true } }),
    ]);

    const preset = activeBusinessType
      ? await getFeatureDefaultsFor(activeBusinessType.id)
      : withDefaults({});

    const knownKeys: readonly string[] = FEATURE_KEYS;
    const overrides: Partial<Record<FeatureKey, boolean>> = {};
    for (const row of overrideRows) {
      if (knownKeys.includes(row.key)) {
        overrides[row.key as FeatureKey] = row.enabled;
      }
    }

    return resolveFeatures(preset, overrides);
  },
);

export async function hasFeature(key: FeatureKey): Promise<boolean> {
  const features = await getEffectiveFeatures();
  return features[key];
}

export async function requireFeature(key: FeatureKey): Promise<void> {
  const allowed = await hasFeature(key);
  if (!allowed) redirect("/dashboard/access-denied?reason=feature");
}

export async function requireFeatureForAction(
  key: FeatureKey,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowed = await hasFeature(key);
  if (!allowed) {
    const t = await getDictionary();
    return { ok: false, error: t.common.featureDisabledError };
  }
  return { ok: true };
}
