"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { hasFeature, requireFeatureForAction } from "@/lib/features";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { tableSchema } from "@/features/tables/schema";
import { createOrder, updateOrderItems, deleteOrder } from "@/features/orders/actions";
import { getDictionary } from "@/i18n/server";
import { formatMessage } from "@/i18n/format";
import { getCheckedOutCafeOrders } from "@/features/tables/queries";
import { parseDateInputValue } from "@/lib/date";

type ActionResult = { error?: string; success?: boolean };

/** 192 bits of CSPRNG entropy, URL-safe — follows the node:crypto
 * precedent already used for document-number check suffixes and
 * Invoice.posSaleToken. Never derived from/equal to Table.id, and never
 * exposed to a public client except inside the printed QR itself. */
function generateQrToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function enableTableQr(id: string): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("QR_ORDERING");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const table = await prisma.table.findUnique({ where: { id }, select: { qrToken: true } });
  if (!table) return { error: t.tables.notFoundError };

  await prisma.table.update({
    where: { id },
    data: {
      qrEnabled: true,
      // Only mint a token the first time — enabling an already-tokened
      // table just flips it back on without invalidating the printed code.
      ...(table.qrToken ? {} : { qrToken: generateQrToken(), qrTokenRotatedAt: new Date() }),
    },
  });

  revalidatePath("/dashboard/tables");
  return { success: true };
}

export async function disableTableQr(id: string): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("QR_ORDERING");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const table = await prisma.table.findUnique({ where: { id }, select: { id: true } });
  if (!table) return { error: t.tables.notFoundError };

  await prisma.table.update({ where: { id }, data: { qrEnabled: false } });

  revalidatePath("/dashboard/tables");
  return { success: true };
}

/** Invalidates the previous QR code immediately — the old token stops
 * resolving the moment this commits, since lookup is by exact match. */
export async function regenerateTableQr(id: string): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("QR_ORDERING");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const table = await prisma.table.findUnique({ where: { id }, select: { id: true } });
  if (!table) return { error: t.tables.notFoundError };

  await prisma.table.update({
    where: { id },
    data: { qrToken: generateQrToken(), qrTokenRotatedAt: new Date(), qrEnabled: true },
  });

  revalidatePath("/dashboard/tables");
  return { success: true };
}

export async function createTable(input: unknown): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("TABLES");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) return { error: t.tables.validationError };

  // Mint the QR code up front when the installation has QR ordering turned
  // on, so a freshly-created table is immediately scannable without a
  // separate manual "enable QR" step.
  const qrOrderingEnabled = await hasFeature("QR_ORDERING");

  try {
    await prisma.table.create({
      data: {
        name: parsed.data.name,
        seats: parsed.data.seats,
        isActive: parsed.data.isActive,
        createdById: access.adminId,
        ...(qrOrderingEnabled
          ? { qrToken: generateQrToken(), qrEnabled: true, qrTokenRotatedAt: new Date() }
          : {}),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: t.tables.nameTakenError };
    }
    return { error: t.tables.createError };
  }

  revalidatePath("/dashboard/tables");
  return { success: true };
}

export async function updateTable(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("TABLES");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) return { error: t.tables.validationError };

  const existing = await prisma.table.findUnique({ where: { id } });
  if (!existing) return { error: t.tables.notFoundError };

  try {
    await prisma.table.update({
      where: { id },
      data: {
        name: parsed.data.name,
        seats: parsed.data.seats,
        isActive: parsed.data.isActive,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: t.tables.nameTakenError };
    }
    return { error: t.tables.updateError };
  }

  revalidatePath("/dashboard/tables");
  revalidatePath("/caisse/cafe");
  return { success: true };
}

export async function deleteTable(id: string): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("TABLES");
  if (!featureAccess.ok) return { error: featureAccess.error };
  const t = await getDictionary();

  const table = await prisma.table.findUnique({
    where: { id },
    include: {
      orders: {
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!table) return { error: t.tables.notFoundError };
  if (table.orders.length > 0) {
    return { error: t.tables.cannotDeleteOccupiedError };
  }

  try {
    await prisma.table.delete({ where: { id } });
  } catch {
    return { error: t.tables.cannotDeleteLinkedError };
  }

  revalidatePath("/dashboard/tables");
  revalidatePath("/caisse/cafe");
  return { success: true };
}

export async function deleteTables(ids: string[]): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const featureAccess = await requireFeatureForAction("TABLES");
  if (!featureAccess.ok) return { error: featureAccess.error };
  if (ids.length === 0) return { success: true };
  const t = await getDictionary();

  const tables = await prisma.table.findMany({
    where: { id: { in: ids } },
    include: {
      orders: {
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        select: { id: true },
        take: 1,
      },
    },
  });

  let failedCount = 0;
  for (const table of tables) {
    if (table.orders.length > 0) {
      failedCount++;
      continue;
    }
    try {
      await prisma.table.delete({ where: { id: table.id } });
    } catch {
      failedCount++;
    }
  }

  revalidatePath("/dashboard/tables");
  revalidatePath("/caisse/cafe");

  if (failedCount > 0) {
    return {
      error: formatMessage(t.tables.bulkDeleteErrorTemplate, {
        count: failedCount,
      }),
    };
  }
  return { success: true };
}

export type SelectedOption = {
  groupName: string;
  optionName: string;
  priceAdjustment: number;
  optionId?: string;
};

type OrderItemLine = {
  id?: string;
  productId: string;
  price: number;
  quantity: number;
  options?: SelectedOption[];
};

export type OpenOrderCartLine = {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  options: SelectedOption[];
};

/** A stable key identifying "this exact variant" of a product — two lines
 * for the same product only merge into one when their selected options are
 * identical, so e.g. a small and a large cappuccino stay separate lines. */
function optionsKey(options?: SelectedOption[]): string {
  return (options ?? [])
    .map((option) => option.optionId ?? option.optionName)
    .sort()
    .join("|");
}

function mergeItem(
  items: OrderItemLine[],
  item: { productId: string; quantity: number; price: number; options?: SelectedOption[] },
): OrderItemLine[] {
  const next = items.map((line) => ({ ...line }));
  const matching = next.find(
    (line) =>
      line.productId === item.productId &&
      optionsKey(line.options) === optionsKey(item.options),
  );
  if (matching) {
    matching.quantity += item.quantity;
  } else {
    next.push({
      productId: item.productId,
      price: item.price,
      quantity: item.quantity,
      options: item.options,
    });
  }
  return next;
}

async function loadCartView(orderId: string): Promise<OpenOrderCartLine[]> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { product: { select: { name: true } }, options: true },
    orderBy: { id: "asc" },
  });
  return items.map((line) => ({
    id: line.id,
    productId: line.productId,
    productName: line.product.name,
    price: Number(line.price),
    quantity: line.quantity.toNumber(),
    options: line.options.map((option) => ({
      groupName: option.groupName,
      optionName: option.optionName,
      priceAdjustment: Number(option.priceAdjustment),
      optionId: option.optionId ?? undefined,
    })),
  }));
}

/**
 * Adds one product to a Cafe open order — the incremental "add item" step
 * of the DINE_IN/TAKEAWAY flow (Table/Menu → Open order → Add items →
 * Checkout). Never touches stock/InventoryMovement itself: it only ever
 * calls the existing, unmodified createOrder/updateOrderItems actions,
 * which are already proven to leave inventory untouched until an invoice
 * is generated via getOrCreateInvoiceForOrder.
 *
 * Reuse-or-create: an explicit `orderId` (continuing an already-open
 * ticket) always wins; otherwise, for DINE_IN, the table's current open
 * order (if any) is reused; otherwise a new order is created. The
 * Order_open_table_unique partial index is the authoritative concurrency
 * guard for two simultaneous "first item" requests on the same table — if
 * this call loses that race, it recovers by falling back to the order the
 * winner just created instead of surfacing an error.
 */
export async function addItemToOpenOrder(input: {
  orderId?: string;
  tableId?: string;
  type: "DINE_IN" | "TAKEAWAY";
  customerId?: string;
  /** Sets a freshly-created order's waiter. Ignored when reusing an
   * already-open order — reassigning an existing order's waiter goes
   * through assignWaiter instead, never silently through an "add item"
   * call. */
  waiterId?: string;
  /** Analytics-only order origin — defaults to STAFF like every existing
   * caller expects. Only acceptCafeOrderRequest ever passes "QR", and only
   * a freshly-created order's source is set; reusing an already-open order
   * never rewrites it. */
  source?: "STAFF" | "QR";
  item: {
    productId: string;
    quantity: number;
    price: number;
    options?: SelectedOption[];
  };
}): Promise<ActionResult & { orderId?: string; items?: OpenOrderCartLine[] }> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const openOrdersAccess = await requireFeatureForAction("OPEN_ORDERS");
  if (!openOrdersAccess.ok) return { error: openOrdersAccess.error };
  if (input.tableId) {
    const tablesAccess = await requireFeatureForAction("TABLES");
    if (!tablesAccess.ok) return { error: tablesAccess.error };
  }
  const t = await getDictionary();

  async function reuseOrder(
    orderId: string,
  ): Promise<ActionResult & { orderId?: string; items?: OpenOrderCartLine[] }> {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { options: true } } },
    });
    if (!existing) return { error: t.orders.notFoundError };

    const currentItems: OrderItemLine[] = existing.items.map((line) => ({
      id: line.id,
      productId: line.productId,
      price: Number(line.price),
      quantity: line.quantity.toNumber(),
      options: line.options.map((option) => ({
        groupName: option.groupName,
        optionName: option.optionName,
        priceAdjustment: Number(option.priceAdjustment),
        optionId: option.optionId ?? undefined,
      })),
    }));
    const nextItems = mergeItem(currentItems, input.item);

    const result = await updateOrderItems(
      orderId,
      { items: nextItems },
      { allowNegativeStock: true },
    );
    if (result.error) return { error: result.error };
    return { success: true, orderId, items: await loadCartView(orderId) };
  }

  let orderId = input.orderId;
  if (!orderId && input.tableId) {
    const openOrder = await prisma.order.findFirst({
      where: { tableId: input.tableId, status: { in: ["PENDING", "PROCESSING"] } },
      select: { id: true },
    });
    orderId = openOrder?.id;
  }

  if (orderId) {
    const result = await reuseOrder(orderId);
    revalidatePath("/caisse/cafe");
    return result;
  }

  const created = await createOrder(
    {
      customerId: input.customerId,
      type: input.type,
      tableId: input.tableId,
      waiterId: input.waiterId,
      source: input.source ?? "STAFF",
      items: [input.item],
    },
    { allowNegativeStock: true, redirect: false },
  );

  if (created.error && input.tableId) {
    // Lost the race for this table's first order to a concurrent request —
    // recover by joining the order that won instead of failing the request.
    const winner = await prisma.order.findFirst({
      where: { tableId: input.tableId, status: { in: ["PENDING", "PROCESSING"] } },
      select: { id: true },
    });
    if (winner) {
      const result = await reuseOrder(winner.id);
      revalidatePath("/caisse/cafe");
      return result;
    }
  }

  revalidatePath("/caisse/cafe");
  if (created.error || !created.orderId) return created;
  return { success: true, orderId: created.orderId, items: await loadCartView(created.orderId) };
}

/**
 * Sets one line's quantity on an open order directly (used by the cart
 * panel's +/- controls) — 0 removes the line. Same reuse of the existing
 * updateOrderItems action as addItemToOpenOrder, so stock/inventory
 * guarantees are identical (untouched until checkout).
 *
 * Keyed by the specific OrderItem line id, not productId — once a product
 * can have several option-variant lines (a small vs. a large cappuccino),
 * productId alone can no longer identify which line to adjust.
 */
export async function setOpenOrderLineQuantity(
  orderId: string,
  lineId: string,
  quantity: number,
): Promise<ActionResult & { items?: OpenOrderCartLine[] }> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const openOrdersAccess = await requireFeatureForAction("OPEN_ORDERS");
  if (!openOrdersAccess.ok) return { error: openOrdersAccess.error };
  const t = await getDictionary();

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!existing) return { error: t.orders.notFoundError };

  const currentItems: OrderItemLine[] = existing.items.map((line) => ({
    id: line.id,
    productId: line.productId,
    price: Number(line.price),
    quantity: line.quantity.toNumber(),
  }));
  const nextItems =
    quantity <= 0
      ? currentItems.filter((line) => line.id !== lineId)
      : currentItems.map((line) =>
          line.id === lineId ? { ...line, quantity } : line,
        );

  // An open order that's had every line removed has nothing left to
  // check out — updateOrderItems requires at least one item, so drop the
  // now-empty order entirely instead (it never touched stock, so there's
  // nothing to reverse), freeing the table immediately.
  if (nextItems.length === 0) {
    const result = await deleteOrder(orderId);
    if (result.error) return { error: result.error };
    revalidatePath("/caisse/cafe");
    return { success: true, items: [] };
  }

  const result = await updateOrderItems(
    orderId,
    { items: nextItems },
    { allowNegativeStock: true },
  );
  if (result.error) return { error: result.error };

  revalidatePath("/caisse/cafe");
  return { success: true, items: await loadCartView(orderId) };
}

/**
 * Assigns (or clears, with waiterId = null) the Cafe floor waiter serving an
 * open order — distinct from createdById (the actor that technically
 * created the record) and never an Admin. Used both for the initial
 * table/takeaway "choose waiter" step and to reassign afterward.
 */
export async function assignWaiter(
  orderId: string,
  waiterId: string | null,
): Promise<ActionResult> {
  const access = await requirePermission("ORDERS_MANAGE");
  if (!access.ok) return { error: access.error };
  const waitersAccess = await requireFeatureForAction("WAITERS");
  if (!waitersAccess.ok) return { error: waitersAccess.error };
  const t = await getDictionary();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) return { error: t.orders.notFoundError };

  if (waiterId) {
    const waiter = await prisma.waiter.findUnique({
      where: { id: waiterId },
      select: { id: true, isActive: true },
    });
    if (!waiter || !waiter.isActive) return { error: t.waiters.notFoundError };
  }

  await prisma.order.update({ where: { id: orderId }, data: { waiterId } });

  revalidatePath("/caisse/cafe");
  return { success: true };
}

/** Next page for the caisse orders screen's infinite scroll. */
export async function fetchCheckedOutCafeOrdersAction(date: string, offset: number) {
  if (!(await hasPermission("POS_VIEW"))) return null;
  if (!(await hasFeature("CAFE_CAISSE"))) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(offset) || offset < 0) {
    return null;
  }
  return getCheckedOutCafeOrders(parseDateInputValue(date), offset);
}
