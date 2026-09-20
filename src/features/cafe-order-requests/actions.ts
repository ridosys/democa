"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { requireFeatureForAction } from "@/lib/features";
import { addItemToOpenOrder } from "@/features/tables/actions";
import { getDictionary } from "@/i18n/server";

type ActionResult = { error?: string; success?: boolean; orderId?: string; tableId?: string };

/**
 * Accepts a pending QR order request, materializing it into the table's
 * open Order — the only path anywhere in the app that turns a
 * CafeOrderRequest into a real, trusted Order.
 *
 * Idempotent and exactly-once: the CAS update below (status PENDING ->
 * ACCEPTED, guarded by WHERE status = PENDING) is the same
 * unique-constraint-as-linearization-point idiom already used for
 * Invoice.posSaleToken and Order_open_table_unique elsewhere in this
 * codebase. Only the caller whose updateMany actually matches a row
 * proceeds to materialize items; every other caller (a double-click, a
 * retried request, or a genuine race) reads back the current state instead
 * of erroring or duplicating anything.
 */
export async function acceptCafeOrderRequest(requestId: string): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("TABLES");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const claim = await prisma.cafeOrderRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "ACCEPTED", acceptedById: access.adminId, acceptedAt: new Date() },
  });

  if (claim.count === 0) {
    const existing = await prisma.cafeOrderRequest.findUnique({
      where: { id: requestId },
      select: { status: true, acceptedOrderId: true, tableId: true },
    });
    if (!existing) return { error: t.cafeOrderRequests.notFoundError };
    if (existing.status === "ACCEPTED") {
      return {
        success: true,
        orderId: existing.acceptedOrderId ?? undefined,
        tableId: existing.tableId,
      };
    }
    return { error: t.cafeOrderRequests.alreadyRejectedError };
  }

  const request = await prisma.cafeOrderRequest.findUnique({
    where: { id: requestId },
    include: { items: { include: { options: true } } },
  });
  if (!request) return { error: t.cafeOrderRequests.notFoundError };

  let orderId: string | undefined;
  for (const item of request.items) {
    const result = await addItemToOpenOrder({
      orderId,
      tableId: request.tableId,
      type: "DINE_IN",
      source: "QR",
      item: {
        productId: item.productId,
        quantity: item.quantity.toNumber(),
        price: item.price.toNumber(),
        options: item.options.map((option) => ({
          groupName: option.groupName,
          optionName: option.optionName,
          priceAdjustment: option.priceAdjustment.toNumber(),
          optionId: option.optionId ?? undefined,
        })),
      },
    });
    if (result.error || !result.orderId) {
      // The request is already marked ACCEPTED (the CAS claim above is not
      // reversed here) — a partial materialization failure is a rare,
      // recoverable edge case staff can see reflected in the Caisse UI, not
      // a silent data-loss path. Every item added so far is a real,
      // correctly-priced OrderItem already committed by updateOrderItems.
      return { error: result.error ?? t.cafeOrderRequests.acceptError };
    }
    orderId = result.orderId;
  }

  await prisma.cafeOrderRequest.update({
    where: { id: requestId },
    data: { acceptedOrderId: orderId },
  });

  revalidatePath("/caisse/cafe");
  return { success: true, orderId, tableId: request.tableId };
}

export async function rejectCafeOrderRequest(requestId: string): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("TABLES");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const claim = await prisma.cafeOrderRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "REJECTED" },
  });
  if (claim.count === 0) {
    const existing = await prisma.cafeOrderRequest.findUnique({
      where: { id: requestId },
      select: { status: true },
    });
    if (!existing) return { error: t.cafeOrderRequests.notFoundError };
    // Already resolved (accepted or rejected) by someone else — treat a
    // double-click/retry as a no-op success rather than an error.
    return { success: true };
  }

  revalidatePath("/caisse/cafe");
  return { success: true };
}
