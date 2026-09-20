"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintErrorOn } from "@/lib/prisma-errors";
import { submitCafeOrderRequestSchema } from "@/features/public-menu/schema";
import { getProductOptionGroups } from "@/features/product-options/queries";
import { hasFeature } from "@/lib/features";
import { getDictionary } from "@/i18n/server";

/**
 * Anonymous, permission-free by design — the public QR menu has no session
 * at all. This never touches Order/Invoice/inventory; it only ever writes a
 * CafeOrderRequest row, which becomes a real Order exclusively through the
 * staff-only acceptCafeOrderRequest action (src/features/cafe-order-requests/actions.ts).
 */
export async function fetchPublicProductOptionGroups(productId: string) {
  if (typeof productId !== "string" || !productId) return [];
  if (!(await hasFeature("QR_ORDERING"))) return [];
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { status: true },
  });
  if (!product || product.status !== "ACTIVE") return [];
  return getProductOptionGroups(productId);
}

// Best-effort, single-instance rate limiting — this app has no distributed
// cache/queue, so this is a DB-based approximation (correct across multiple
// app instances sharing the same Postgres, unlike an in-memory map), not a
// hardened solution.
const MIN_SECONDS_BETWEEN_SUBMISSIONS = 5;

type SubmitResult = { error?: string; success?: boolean; requestId?: string };

export async function submitCafeOrderRequest(input: unknown): Promise<SubmitResult> {
  const t = await getDictionary();

  // Defense in depth: the public page itself already 404s when this
  // feature is off, but a direct call to this action must independently
  // refuse too, not rely on the page having gated access.
  if (!(await hasFeature("QR_ORDERING"))) {
    return { error: t.publicMenu.tableUnavailableError };
  }

  const parsed = submitCafeOrderRequestSchema.safeParse(input);
  if (!parsed.success) return { error: t.publicMenu.validationError };

  const table = await prisma.table.findUnique({
    where: { qrToken: parsed.data.qrToken },
    select: { id: true, isActive: true, qrEnabled: true },
  });
  if (!table || !table.isActive || !table.qrEnabled) {
    return { error: t.publicMenu.tableUnavailableError };
  }

  const recent = await prisma.cafeOrderRequest.count({
    where: {
      tableId: table.id,
      createdAt: { gte: new Date(Date.now() - MIN_SECONDS_BETWEEN_SUBMISSIONS * 1000) },
    },
  });
  if (recent > 0) return { error: t.publicMenu.tooManyRequestsError };

  const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE" },
  });
  const productById = new Map(products.map((p) => [p.id, p]));
  if (products.length !== productIds.length) {
    return { error: t.publicMenu.productUnavailableError };
  }

  type ResolvedItem = {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    options: { groupName: string; optionName: string; priceAdjustment: number; optionId: string }[];
  };
  const resolvedItems: ResolvedItem[] = [];

  for (const item of parsed.data.items) {
    const product = productById.get(item.productId)!;
    const groups = await getProductOptionGroups(item.productId);
    const optionsById = new Map(
      groups.flatMap((group) =>
        group.options
          .filter((option) => option.isActive)
          .map((option) => [option.id, { groupName: group.name, ...option }] as const),
      ),
    );

    const selected: ResolvedItem["options"] = [];
    for (const optionId of item.optionIds) {
      const option = optionsById.get(optionId);
      // An optionId that doesn't resolve to an active option under this
      // exact product is rejected outright, never silently dropped or
      // applied to the wrong product's pricing.
      if (!option) return { error: t.publicMenu.invalidOptionError };
      selected.push({
        groupName: option.groupName,
        optionName: option.name,
        priceAdjustment: option.priceAdjustment,
        optionId: option.id,
      });
    }

    const price = product.price1.toNumber() + selected.reduce((sum, o) => sum + o.priceAdjustment, 0);
    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      price,
      options: selected,
    });
  }

  const total = resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  try {
    const request = await prisma.cafeOrderRequest.create({
      data: {
        tableId: table.id,
        idempotencyKey: parsed.data.idempotencyKey,
        notes: parsed.data.notes || null,
        total,
        items: {
          create: resolvedItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            options: item.options.length
              ? {
                  create: item.options.map((o) => ({
                    groupName: o.groupName,
                    optionName: o.optionName,
                    priceAdjustment: o.priceAdjustment,
                    optionId: o.optionId,
                  })),
                }
              : undefined,
          })),
        },
      },
    });
    revalidatePath("/caisse/cafe");
    return { success: true, requestId: request.id };
  } catch (error) {
    if (isUniqueConstraintErrorOn(error, "idempotencyKey")) {
      // A retried/duplicate network submission — hand back the request the
      // first attempt already created instead of erroring or duplicating it.
      const existing = await prisma.cafeOrderRequest.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
        select: { id: true },
      });
      if (existing) return { success: true, requestId: existing.id };
    }
    return { error: t.publicMenu.submitError };
  }
}
