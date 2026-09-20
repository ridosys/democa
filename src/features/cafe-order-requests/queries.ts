import "server-only";
import { prisma } from "@/lib/prisma";

/** Pending QR order requests waiting for staff review — the Cafe Caisse
 * "incoming orders" queue. Never reads Order/Invoice; a request only
 * becomes one of those via acceptCafeOrderRequest. */
export async function getPendingCafeOrderRequests() {
  const requests = await prisma.cafeOrderRequest.findMany({
    where: { status: "PENDING" },
    include: {
      table: { select: { id: true, name: true } },
      items: { include: { options: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return requests.map((request) => ({
    id: request.id,
    tableId: request.table.id,
    tableName: request.table.name,
    notes: request.notes,
    total: request.total.toNumber(),
    itemCount: request.items.reduce((sum, item) => sum + item.quantity.toNumber(), 0),
    createdAt: request.createdAt,
    items: request.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity.toNumber(),
      price: item.price.toNumber(),
      options: item.options.map((option) => ({
        groupName: option.groupName,
        optionName: option.optionName,
      })),
    })),
  }));
}

export type PendingCafeOrderRequest = Awaited<
  ReturnType<typeof getPendingCafeOrderRequests>
>[number];
