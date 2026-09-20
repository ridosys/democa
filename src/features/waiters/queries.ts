import "server-only";
import { prisma } from "@/lib/prisma";

export const WAITERS_PAGE_SIZE = 20;

export async function getWaitersPage({
  query,
  page,
}: {
  query?: string;
  page: number;
}) {
  const where = query
    ? { name: { contains: query, mode: "insensitive" as const } }
    : {};

  const [items, total] = await Promise.all([
    prisma.waiter.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * WAITERS_PAGE_SIZE,
      take: WAITERS_PAGE_SIZE,
    }),
    prisma.waiter.count({ where }),
  ]);

  return { items, total, pageSize: WAITERS_PAGE_SIZE };
}

export async function getWaiterById(id: string) {
  return prisma.waiter.findUnique({ where: { id } });
}

/** For the Cafe Caisse "choose waiter" step — active waiters only, image
 * included so the picker can show a photo like the customer picker does. */
export async function getActiveWaiters() {
  const waiters = await prisma.waiter.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageUrl: true },
  });
  return waiters;
}

export type WaiterPeriodStats = { orderCount: number; revenue: number };

/** Invoiced orders this waiter served in [from, to) — revenue only ever
 * comes from real Invoice rows, same as every other "sales by X" query in
 * this app, so a waiter's stats can never include an order that was never
 * actually checked out. */
async function waiterPeriodStats(
  waiterId: string,
  from: Date,
  to: Date,
): Promise<WaiterPeriodStats> {
  const rows = await prisma.$queryRaw<{ orderCount: bigint; revenue: string }[]>`
    SELECT COUNT(DISTINCT i.id)::bigint as "orderCount",
      COALESCE(SUM(i.total), 0)::numeric as revenue
    FROM public."Invoice" i
    JOIN public."Order" o ON o.id = i."orderId"
    WHERE o."waiterId" = ${waiterId} AND i."createdAt" BETWEEN ${from} AND ${to}
  `;
  return {
    orderCount: Number(rows[0]?.orderCount ?? 0),
    revenue: Number(rows[0]?.revenue ?? 0),
  };
}

export type WaiterRecentOrder = {
  invoiceId: string;
  invoiceNumber: string;
  orderNumber: string;
  type: "RETAIL" | "DINE_IN" | "TAKEAWAY";
  tableName: string | null;
  total: number;
  createdAt: Date;
};

export const WAITER_RECENT_ORDERS_PAGE_SIZE = 10;

export async function getWaiterProfile(id: string, ordersPage: number = 1) {
  const waiter = await prisma.waiter.findUnique({ where: { id } });
  if (!waiter) return null;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const epoch = new Date(0);

  const recentOrdersWhere = { order: { waiterId: id } };

  const [today, thisWeek, thisMonth, allTime, recentInvoices, recentOrdersTotal] =
    await Promise.all([
      waiterPeriodStats(id, startOfToday, now),
      waiterPeriodStats(id, startOfWeek, now),
      waiterPeriodStats(id, startOfMonth, now),
      waiterPeriodStats(id, epoch, now),
      prisma.invoice.findMany({
        where: recentOrdersWhere,
        orderBy: { createdAt: "desc" },
        skip: (ordersPage - 1) * WAITER_RECENT_ORDERS_PAGE_SIZE,
        take: WAITER_RECENT_ORDERS_PAGE_SIZE,
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          createdAt: true,
          order: {
            select: {
              orderNumber: true,
              type: true,
              table: { select: { name: true } },
            },
          },
        },
      }),
      prisma.invoice.count({ where: recentOrdersWhere }),
    ]);

  const recentOrders: WaiterRecentOrder[] = recentInvoices
    .filter((invoice) => invoice.order)
    .map((invoice) => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.order!.orderNumber,
      type: invoice.order!.type,
      tableName: invoice.order!.table?.name ?? null,
      total: invoice.total.toNumber(),
      createdAt: invoice.createdAt,
    }));

  return {
    waiter,
    today,
    thisWeek,
    thisMonth,
    allTime,
    recentOrders,
    recentOrdersTotal,
    recentOrdersPageSize: WAITER_RECENT_ORDERS_PAGE_SIZE,
  };
}

export type WaiterProfile = NonNullable<Awaited<ReturnType<typeof getWaiterProfile>>>;
