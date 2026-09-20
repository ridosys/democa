"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { requireBusinessSettingsManagementForAction } from "@/lib/env-features";
import { getDictionary } from "@/i18n/server";
import { getSystemSettingsRow } from "@/features/settings/queries";
import {
  getActiveBusinessType,
  getFeatureDefaultsFor,
} from "@/features/business/queries";
import {
  setActiveBusinessTypeSchema,
  createBusinessTypeSchema,
  renameBusinessTypeSchema,
  featureDefaultSchema,
  featureOverrideSchema,
} from "@/features/business/schema";
import {
  FEATURE_KEYS,
  FEATURE_DEPENDENCIES,
  resolveFeatures,
  type FeatureKey,
} from "@/lib/feature-catalog";

type ActionResult = { error?: string; success?: boolean };

/** Derives a stable, unique BUSINESS_TYPE-style key from an admin-entered
 * name — the admin only ever types a display name; this internal key is
 * never shown to them, only used as the row's identity. */
async function deriveUniqueKey(name: string): Promise<string> {
  const base =
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "BUSINESS_TYPE";

  let key = base;
  let suffix = 2;
  while (
    await prisma.businessTypeDef.findUnique({
      where: { key },
      select: { id: true },
    })
  ) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  return key;
}

export async function createBusinessType(
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("SETTINGS_MANAGE");
  if (!access.ok) return { error: access.error };
  const envAccess = await requireBusinessSettingsManagementForAction();
  if (!envAccess.ok) return { error: envAccess.error };
  const t = await getDictionary();

  const parsed = createBusinessTypeSchema.safeParse(input);
  if (!parsed.success) return { error: t.settings.business.validationError };

  const key = await deriveUniqueKey(parsed.data.name);

  await prisma.$transaction(async (tx) => {
    const businessType = await tx.businessTypeDef.create({
      data: { key, name: parsed.data.name, createdById: access.adminId },
    });
    // A brand-new type starts with every feature off — an admin builds up
    // its preset explicitly from the settings page, same as the seeded
    // types started before this migration.
    await tx.featureDefault.createMany({
      data: FEATURE_KEYS.map((featureKey) => ({
        businessTypeId: businessType.id,
        key: featureKey,
        enabled: false,
      })),
    });
  });

  revalidatePath("/dashboard/settings/business");
  return { success: true };
}

export async function renameBusinessType(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("SETTINGS_MANAGE");
  if (!access.ok) return { error: access.error };
  const envAccess = await requireBusinessSettingsManagementForAction();
  if (!envAccess.ok) return { error: envAccess.error };
  const t = await getDictionary();

  const parsed = renameBusinessTypeSchema.safeParse(input);
  if (!parsed.success) return { error: t.settings.business.validationError };

  const existing = await prisma.businessTypeDef.findUnique({ where: { id } });
  if (!existing) return { error: t.settings.business.typeNotFoundError };

  await prisma.businessTypeDef.update({
    where: { id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/dashboard/settings/business");
  return { success: true };
}

export async function deleteBusinessType(id: string): Promise<ActionResult> {
  const access = await requirePermission("SETTINGS_MANAGE");
  if (!access.ok) return { error: access.error };
  const envAccess = await requireBusinessSettingsManagementForAction();
  if (!envAccess.ok) return { error: envAccess.error };
  const t = await getDictionary();

  const [businessType, settingsRow] = await Promise.all([
    prisma.businessTypeDef.findUnique({ where: { id } }),
    getSystemSettingsRow(),
  ]);
  if (!businessType) return { error: t.settings.business.typeNotFoundError };
  if (businessType.isSystem) {
    return { error: t.settings.business.cannotDeleteSystemTypeError };
  }
  if (settingsRow?.businessTypeId === id) {
    return { error: t.settings.business.cannotDeleteActiveTypeError };
  }

  await prisma.businessTypeDef.delete({ where: { id } });

  revalidatePath("/dashboard/settings/business");
  return { success: true };
}

export async function setActiveBusinessType(
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("SETTINGS_MANAGE");
  if (!access.ok) return { error: access.error };
  const envAccess = await requireBusinessSettingsManagementForAction();
  if (!envAccess.ok) return { error: envAccess.error };
  const t = await getDictionary();

  const parsed = setActiveBusinessTypeSchema.safeParse(input);
  if (!parsed.success) return { error: t.settings.business.validationError };

  const businessType = await prisma.businessTypeDef.findUnique({
    where: { id: parsed.data.businessTypeId },
  });
  if (!businessType) return { error: t.settings.business.typeNotFoundError };

  const existing = await getSystemSettingsRow();
  if (existing) {
    await prisma.systemSettings.update({
      where: { id: existing.id },
      data: { businessTypeId: businessType.id },
    });
  } else {
    await prisma.systemSettings.create({
      data: { businessTypeId: businessType.id },
    });
  }

  revalidatePath("/", "layout");
  return { success: true };
}

function dependentsOf(key: FeatureKey): FeatureKey[] {
  const dependents: FeatureKey[] = [];
  let frontier: FeatureKey[] = [key];
  while (frontier.length > 0) {
    const next: FeatureKey[] = [];
    for (const candidate of FEATURE_KEYS) {
      const deps = FEATURE_DEPENDENCIES[candidate] ?? [];
      if (
        frontier.some((f) => deps.includes(f)) &&
        !dependents.includes(candidate)
      ) {
        dependents.push(candidate);
        next.push(candidate);
      }
    }
    frontier = next;
  }
  return dependents;
}

function dependenciesOf(key: FeatureKey): FeatureKey[] {
  const deps: FeatureKey[] = [];
  let frontier: FeatureKey[] = FEATURE_DEPENDENCIES[key] ?? [];
  while (frontier.length > 0) {
    const next: FeatureKey[] = [];
    for (const dep of frontier) {
      if (!deps.includes(dep)) {
        deps.push(dep);
        next.push(...(FEATURE_DEPENDENCIES[dep] ?? []));
      }
    }
    frontier = next;
  }
  return deps;
}

export async function updateFeatureDefault(
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("SETTINGS_MANAGE");
  if (!access.ok) return { error: access.error };
  const envAccess = await requireBusinessSettingsManagementForAction();
  if (!envAccess.ok) return { error: envAccess.error };
  const t = await getDictionary();

  const parsed = featureDefaultSchema.safeParse(input);
  if (!parsed.success) return { error: t.settings.business.validationError };
  const { businessTypeId, key, enabled } = parsed.data;

  const businessType = await prisma.businessTypeDef.findUnique({
    where: { id: businessTypeId },
  });
  if (!businessType) return { error: t.settings.business.typeNotFoundError };

  const preset = await getFeatureDefaultsFor(businessTypeId);
  const keysToCascadeEnable = enabled
    ? dependenciesOf(key).filter((dep) => !preset[dep])
    : [];
  const keysToCascadeDisable = enabled
    ? []
    : dependentsOf(key).filter((dep) => preset[dep]);

  await prisma.$transaction([
    prisma.featureDefault.upsert({
      where: { businessTypeId_key: { businessTypeId, key } },
      create: { businessTypeId, key, enabled },
      update: { enabled },
    }),
    ...keysToCascadeEnable.map((dep) =>
      prisma.featureDefault.upsert({
        where: { businessTypeId_key: { businessTypeId, key: dep } },
        create: { businessTypeId, key: dep, enabled: true },
        update: { enabled: true },
      }),
    ),
    ...keysToCascadeDisable.map((dep) =>
      prisma.featureDefault.upsert({
        where: { businessTypeId_key: { businessTypeId, key: dep } },
        create: { businessTypeId, key: dep, enabled: false },
        update: { enabled: false },
      }),
    ),
  ]);

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateFeatureOverride(
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("SETTINGS_MANAGE");
  if (!access.ok) return { error: access.error };
  const envAccess = await requireBusinessSettingsManagementForAction();
  if (!envAccess.ok) return { error: envAccess.error };
  const t = await getDictionary();

  const parsed = featureOverrideSchema.safeParse(input);
  if (!parsed.success) return { error: t.settings.business.validationError };
  const { key, enabled } = parsed.data;

  const activeBusinessType = await getActiveBusinessType();
  const preset = activeBusinessType
    ? await getFeatureDefaultsFor(activeBusinessType.id)
    : ({} as Record<FeatureKey, boolean>);
  const overrideRows = await prisma.featureOverride.findMany({
    select: { key: true, enabled: true },
  });
  const overrides: Partial<Record<FeatureKey, boolean>> = {};
  for (const row of overrideRows) {
    if ((FEATURE_KEYS as readonly string[]).includes(row.key)) {
      overrides[row.key as FeatureKey] = row.enabled;
    }
  }
  const resolvedBefore = resolveFeatures(preset, overrides);

  const keysToCascadeEnable = enabled
    ? dependenciesOf(key).filter((dep) => !resolvedBefore[dep])
    : [];
  const keysToCascadeDisable = enabled
    ? []
    : dependentsOf(key).filter((dep) => resolvedBefore[dep]);

  await prisma.$transaction([
    prisma.featureOverride.upsert({
      where: { key },
      create: { key, enabled, updatedById: access.adminId },
      update: { enabled, updatedById: access.adminId },
    }),
    ...keysToCascadeEnable.map((dep) =>
      prisma.featureOverride.upsert({
        where: { key: dep },
        create: { key: dep, enabled: true, updatedById: access.adminId },
        update: { enabled: true, updatedById: access.adminId },
      }),
    ),
    ...keysToCascadeDisable.map((dep) =>
      prisma.featureOverride.upsert({
        where: { key: dep },
        create: { key: dep, enabled: false, updatedById: access.adminId },
        update: { enabled: false, updatedById: access.adminId },
      }),
    ),
  ]);

  revalidatePath("/", "layout");
  return { success: true };
}

export async function resetFeatureOverrides(): Promise<ActionResult> {
  const access = await requirePermission("SETTINGS_MANAGE");
  if (!access.ok) return { error: access.error };
  const envAccess = await requireBusinessSettingsManagementForAction();
  if (!envAccess.ok) return { error: envAccess.error };

  await prisma.featureOverride.deleteMany({});

  revalidatePath("/", "layout");
  return { success: true };
}
