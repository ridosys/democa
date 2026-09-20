"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { requireFeatureForAction } from "@/lib/features";
import { waiterSchema } from "@/features/waiters/schema";
import { getDictionary } from "@/i18n/server";

type ActionResult = { error?: string; success?: boolean };

export async function createWaiter(input: unknown): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("WAITERS");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const parsed = waiterSchema.safeParse(input);
  if (!parsed.success) return { error: t.waiters.validationError };

  await prisma.waiter.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      isActive: parsed.data.isActive,
      imageUrl: parsed.data.image?.secureUrl ?? null,
      imagePublicId: parsed.data.image?.publicId ?? null,
      createdById: access.adminId,
    },
  });

  revalidatePath("/dashboard/waiters");
  return { success: true };
}

export async function updateWaiter(id: string, input: unknown): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("WAITERS");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const parsed = waiterSchema.safeParse(input);
  if (!parsed.success) return { error: t.waiters.validationError };

  const existing = await prisma.waiter.findUnique({ where: { id } });
  if (!existing) return { error: t.waiters.notFoundError };

  await prisma.waiter.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      isActive: parsed.data.isActive,
      ...(parsed.data.image !== undefined
        ? {
            imageUrl: parsed.data.image?.secureUrl ?? null,
            imagePublicId: parsed.data.image?.publicId ?? null,
          }
        : {}),
    },
  });

  revalidatePath("/dashboard/waiters");
  revalidatePath("/caisse/cafe");
  return { success: true };
}

export async function deleteWaiter(id: string): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("WAITERS");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const waiter = await prisma.waiter.findUnique({
    where: { id },
    include: { orders: { select: { id: true }, take: 1 } },
  });
  if (!waiter) return { error: t.waiters.notFoundError };
  if (waiter.orders.length > 0) {
    // Has order history — deactivate instead of a hard delete, so past
    // "sales by staff" attribution never silently loses its name.
    return { error: t.waiters.cannotDeleteLinkedError };
  }

  await prisma.waiter.delete({ where: { id } });

  revalidatePath("/dashboard/waiters");
  return { success: true };
}
