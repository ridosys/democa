"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { requireFeatureForAction, hasFeature } from "@/lib/features";
import {
  optionGroupSchema,
  productOptionSchema,
} from "@/features/product-options/schema";
import { getProductOptionGroups } from "@/features/product-options/queries";
import { getDictionary } from "@/i18n/server";

type ActionResult = { error?: string; success?: boolean };

export async function fetchProductOptionGroupsAction(productId: string) {
  if (!(await hasPermission("POS_VIEW"))) return [];
  if (!(await hasFeature("PRODUCT_OPTIONS"))) return [];
  return getProductOptionGroups(productId);
}

function productPath(productId: string) {
  return `/dashboard/products/${productId}`;
}

export async function createOptionGroup(
  productId: string,
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("PRODUCTS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("PRODUCT_OPTIONS");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const parsed = optionGroupSchema.safeParse(input);
  if (!parsed.success) return { error: t.productOptions.validationError };

  const lastGroup = await prisma.productOptionGroup.findFirst({
    where: { productId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  try {
    await prisma.productOptionGroup.create({
      data: {
        productId,
        name: parsed.data.name,
        isRequired: parsed.data.isRequired,
        allowMultiple: parsed.data.allowMultiple,
        position: (lastGroup?.position ?? 0) + 1,
      },
    });
  } catch {
    return { error: t.productOptions.createGroupError };
  }

  revalidatePath(productPath(productId));
  return { success: true };
}

export async function updateOptionGroup(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("PRODUCTS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("PRODUCT_OPTIONS");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const parsed = optionGroupSchema.safeParse(input);
  if (!parsed.success) return { error: t.productOptions.validationError };

  const group = await prisma.productOptionGroup.findUnique({ where: { id } });
  if (!group) return { error: t.productOptions.groupNotFoundError };

  try {
    await prisma.productOptionGroup.update({
      where: { id },
      data: {
        name: parsed.data.name,
        isRequired: parsed.data.isRequired,
        allowMultiple: parsed.data.allowMultiple,
      },
    });
  } catch {
    return { error: t.productOptions.updateGroupError };
  }

  revalidatePath(productPath(group.productId));
  return { success: true };
}

export async function deleteOptionGroup(id: string): Promise<ActionResult> {
  const access = await requirePermission("PRODUCTS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("PRODUCT_OPTIONS");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const group = await prisma.productOptionGroup.findUnique({ where: { id } });
  if (!group) return { error: t.productOptions.groupNotFoundError };

  await prisma.productOptionGroup.delete({ where: { id } });

  revalidatePath(productPath(group.productId));
  return { success: true };
}

export async function createProductOption(
  groupId: string,
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("PRODUCTS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("PRODUCT_OPTIONS");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const parsed = productOptionSchema.safeParse(input);
  if (!parsed.success) return { error: t.productOptions.validationError };

  const group = await prisma.productOptionGroup.findUnique({
    where: { id: groupId },
  });
  if (!group) return { error: t.productOptions.groupNotFoundError };

  const lastOption = await prisma.productOption.findFirst({
    where: { groupId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  try {
    await prisma.productOption.create({
      data: {
        groupId,
        name: parsed.data.name,
        priceAdjustment: parsed.data.priceAdjustment,
        isActive: parsed.data.isActive,
        position: (lastOption?.position ?? 0) + 1,
      },
    });
  } catch {
    return { error: t.productOptions.createOptionError };
  }

  revalidatePath(productPath(group.productId));
  return { success: true };
}

export async function updateProductOption(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("PRODUCTS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("PRODUCT_OPTIONS");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const parsed = productOptionSchema.safeParse(input);
  if (!parsed.success) return { error: t.productOptions.validationError };

  const option = await prisma.productOption.findUnique({
    where: { id },
    include: { group: { select: { productId: true } } },
  });
  if (!option) return { error: t.productOptions.optionNotFoundError };

  try {
    await prisma.productOption.update({
      where: { id },
      data: {
        name: parsed.data.name,
        priceAdjustment: parsed.data.priceAdjustment,
        isActive: parsed.data.isActive,
      },
    });
  } catch {
    return { error: t.productOptions.updateOptionError };
  }

  revalidatePath(productPath(option.group.productId));
  return { success: true };
}

export async function deleteProductOption(id: string): Promise<ActionResult> {
  const access = await requirePermission("PRODUCTS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("PRODUCT_OPTIONS");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const option = await prisma.productOption.findUnique({
    where: { id },
    include: { group: { select: { productId: true } } },
  });
  if (!option) return { error: t.productOptions.optionNotFoundError };

  await prisma.productOption.delete({ where: { id } });

  revalidatePath(productPath(option.group.productId));
  return { success: true };
}
