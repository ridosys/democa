export const FEATURE_KEYS = [
  "OPEN_ORDERS",
  "TABLES",
  "PRODUCT_OPTIONS",
  "QR_ORDERING",
  "RETAIL_CAISSE",
  "CAFE_CAISSE",
  "CUSTOMERS",
  "WAITERS",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_DEPENDENCIES: Partial<Record<FeatureKey, FeatureKey[]>> = {
  TABLES: ["OPEN_ORDERS"],
  QR_ORDERING: ["TABLES"],
  CAFE_CAISSE: ["OPEN_ORDERS"],
  WAITERS: ["OPEN_ORDERS"],
};

/** A default/enabled map missing an entry for some key resolves that key to
 * disabled — used for both the per-business-type preset (FeatureDefault
 * rows) and the installation-level overrides (FeatureOverride rows). */
export function withDefaults(
  partial: Partial<Record<FeatureKey, boolean>>,
): Record<FeatureKey, boolean> {
  const full = {} as Record<FeatureKey, boolean>;
  for (const key of FEATURE_KEYS) full[key] = partial[key] ?? false;
  return full;
}

/** Merges a business type's preset (now stored in the FeatureDefault table,
 * see src/features/business/queries.ts) with installation-level overrides,
 * then clamps anything whose dependency isn't satisfied back to disabled. */
export function resolveFeatures(
  preset: Partial<Record<FeatureKey, boolean>>,
  overrides: Partial<Record<FeatureKey, boolean>>,
): Record<FeatureKey, boolean> {
  const merged = withDefaults({ ...preset, ...overrides });
  for (const key of FEATURE_KEYS) {
    const deps = FEATURE_DEPENDENCIES[key] ?? [];
    if (deps.some((dep) => !merged[dep])) merged[key] = false;
  }
  return merged;
}
