import "server-only";
import { prisma } from "@/lib/prisma";
import { truncExpr } from "@/features/dashboard/analytics-queries";
import { toDateInputValue } from "@/lib/date";
import type { OpenOrderCartLine } from "@/features/tables/actions";

/** A table's occupied/free state is derived, not stored — this is the one
 * place that reads it, by looking for the table's current open order
 * (PENDING/PROCESSING). Anything downstream should treat `openOrder` as the
 * single source of truth for occupancy rather than caching a boolean. */
export async function getTablesWithOpenOrders() {
  const tables = await prisma.table.findMany({
    include: {
      orders: {
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          createdAt: true,
          waiter: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return tables.map((table) => {
    const openOrder = table.orders[0] ?? null;
    return {
      id: table.id,
      name: table.name,
      seats: table.seats,
      isActive: table.isActive,
      qrToken: table.qrToken,
      qrEnabled: table.qrEnabled,
      openOrder: openOrder
        ? {
            id: openOrder.id,
            orderNumber: openOrder.orderNumber,
            total: openOrder.total.toNumber(),
            createdAt: openOrder.createdAt,
            waiterName: openOrder.waiter?.name ?? null,
          }
        : null,
    };
  });
}

export async function getTableById(id: string) {
  return prisma.table.findUnique({ where: { id } });
}

export const TABLE_RECENT_SESSIONS_PAGE_SIZE = 10;
export const TABLE_DAILY_OCCUPANCY_PAGE_SIZE = 15;
export const TABLE_DAILY_OCCUPANCY_DEFAULT_DAYS = 15;

export type TableSessionStats = { sessionCount: number; revenue: number };

// createdAt is stored as a naive "timestamp without time zone" and the DB
// session runs in GMT, so Postgres's date_trunc()/day-boundary comparisons
// align to UTC clock boundaries (same fact documented on truncExpr in
// analytics-queries.ts). Every date boundary in this file is therefore
// built with UTC-* Date methods, never the local-timezone
// setHours/setDate/setMonth — on a server running outside UTC (this one
// runs at UTC+1), mixing the two caused today's sessions to get split
// across two different "days" depending on which stat computed them,
// e.g. the Sessions card's "Today" count disagreeing with the Daily
// occupancy row for the same date.
function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** One "session" is one Order row for this table — opened when a table is
 * seated, closed when it's checked out (or still open). Revenue only ever
 * comes from a linked Invoice (LEFT JOIN, so an open/uninvoiced session
 * contributes 0), matching every other "sales by X" query in this app —
 * never derived from Order.total, which can still change while a session
 * is in progress. */
async function tableSessionStats(
  tableId: string,
  from: Date,
  to: Date,
): Promise<TableSessionStats> {
  const rows = await prisma.$queryRaw<{ sessionCount: bigint; revenue: string }[]>`
    SELECT COUNT(DISTINCT o.id)::bigint as "sessionCount",
      COALESCE(SUM(i.total), 0)::numeric as revenue
    FROM public."Order" o
    LEFT JOIN public."Invoice" i ON i."orderId" = o.id
    WHERE o."tableId" = ${tableId} AND o."createdAt" BETWEEN ${from} AND ${to}
  `;
  return {
    sessionCount: Number(rows[0]?.sessionCount ?? 0),
    revenue: Number(rows[0]?.revenue ?? 0),
  };
}

export type TableDailyOccupancy = { day: Date; sessionCount: number; revenue: number };
export type TableDailyOccupancyPage = {
  items: TableDailyOccupancy[];
  total: number;
  pageSize: number;
};

/** Defaults the Daily occupancy filter to the last N UTC calendar days
 * (inclusive of today) when the table profile page has no explicit
 * occupancyFrom/occupancyTo in the URL yet. */
export function defaultOccupancyRange(): { from: Date; to: Date } {
  const to = utcMidnight(new Date());
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (TABLE_DAILY_OCCUPANCY_DEFAULT_DAYS - 1));
  return { from, to };
}

/** How many times this table was seated on each day of [from, to] (both
 * inclusive UTC calendar days), paginated newest-first in fixed-size
 * windows of days — page 1 is the pageSize days closest to `to`, page 2
 * the pageSize days before that, and so on down to `from`. Days with zero
 * sessions are filled in afterward (the query only ever returns rows for
 * days that actually had one), so a page is always a complete run of
 * consecutive days rather than a sparse one. */
async function getTableDailyOccupancyPage({
  tableId,
  from,
  to,
  page,
}: {
  tableId: string;
  from: Date;
  to: Date;
  page: number;
}): Promise<TableDailyOccupancyPage> {
  const pageSize = TABLE_DAILY_OCCUPANCY_PAGE_SIZE;
  // Defensive swap — a mis-set filter (from after to) would otherwise
  // produce a negative day count.
  const rangeFrom = from <= to ? from : to;
  const rangeTo = from <= to ? to : from;
  const total = Math.round((rangeTo.getTime() - rangeFrom.getTime()) / 86_400_000) + 1;

  const windowEnd = new Date(rangeTo);
  windowEnd.setUTCDate(windowEnd.getUTCDate() - (page - 1) * pageSize);
  if (windowEnd < rangeFrom) return { items: [], total, pageSize };

  const windowStart = new Date(windowEnd);
  windowStart.setUTCDate(windowStart.getUTCDate() - (pageSize - 1));
  const effectiveStart = windowStart < rangeFrom ? rangeFrom : windowStart;

  const queryEnd = new Date(windowEnd);
  queryEnd.setUTCDate(queryEnd.getUTCDate() + 1); // exclusive upper bound

  const rows = await prisma.$queryRaw<
    { day: Date; sessionCount: bigint; revenue: string }[]
  >`
    SELECT ${truncExpr("day", 'o."createdAt"')} as day,
      COUNT(*)::bigint as "sessionCount",
      COALESCE(SUM(i.total), 0)::numeric as revenue
    FROM public."Order" o
    LEFT JOIN public."Invoice" i ON i."orderId" = o.id
    WHERE o."tableId" = ${tableId} AND o."createdAt" >= ${effectiveStart} AND o."createdAt" < ${queryEnd}
    GROUP BY day
  `;
  const byDay = new Map(
    rows.map((row) => [
      toDateInputValue(row.day),
      { sessionCount: Number(row.sessionCount), revenue: Number(row.revenue) },
    ]),
  );

  const items: TableDailyOccupancy[] = [];
  const cursor = new Date(windowEnd);
  while (cursor >= effectiveStart) {
    const stats = byDay.get(toDateInputValue(cursor));
    items.push({
      day: new Date(cursor),
      sessionCount: stats?.sessionCount ?? 0,
      revenue: stats?.revenue ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { items, total, pageSize };
}

export type TableRecentSession = {
  orderId: string;
  orderNumber: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  waiterName: string | null;
  total: number;
  createdAt: Date;
  closedAt: Date | null;
  durationMinutes: number | null;
};

/** Every past seating of this table (not just invoiced ones) — a currently
 * open session is included with closedAt/durationMinutes null and its
 * running Order.total, so "Table 5 has been occupied since 14:32" shows up
 * in its own history instead of only appearing once it's checked out. */
export async function getTableRecentSessionsPage({
  tableId,
  page,
}: {
  tableId: string;
  page: number;
}) {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { tableId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * TABLE_RECENT_SESSIONS_PAGE_SIZE,
      take: TABLE_RECENT_SESSIONS_PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        waiter: { select: { name: true } },
        invoice: { select: { total: true, createdAt: true } },
      },
    }),
    prisma.order.count({ where: { tableId } }),
  ]);

  const items: TableRecentSession[] = orders.map((order) => ({
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    waiterName: order.waiter?.name ?? null,
    total: (order.invoice?.total ?? order.total).toNumber(),
    createdAt: order.createdAt,
    closedAt: order.invoice?.createdAt ?? null,
    durationMinutes: order.invoice
      ? Math.max(
          0,
          Math.round((order.invoice.createdAt.getTime() - order.createdAt.getTime()) / 60000),
        )
      : null,
  }));

  return { items, total, pageSize: TABLE_RECENT_SESSIONS_PAGE_SIZE };
}

export async function getTableProfile(
  id: string,
  options: {
    sessionsPage?: number;
    occupancyFrom?: Date;
    occupancyTo?: Date;
    occupancyPage?: number;
  } = {},
) {
  const { sessionsPage = 1, occupancyFrom, occupancyTo, occupancyPage = 1 } = options;

  const table = await prisma.table.findUnique({ where: { id } });
  if (!table) return null;

  const now = new Date();
  const startOfToday = utcMidnight(now);
  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7);
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const epoch = new Date(0);
  const defaultRange = defaultOccupancyRange();
  const occupancyRange = {
    from: occupancyFrom ?? defaultRange.from,
    to: occupancyTo ?? defaultRange.to,
  };

  const [today, thisWeek, thisMonth, allTime, dailyOccupancy, recentSessions] =
    await Promise.all([
      tableSessionStats(id, startOfToday, now),
      tableSessionStats(id, startOfWeek, now),
      tableSessionStats(id, startOfMonth, now),
      tableSessionStats(id, epoch, now),
      getTableDailyOccupancyPage({
        tableId: id,
        from: occupancyRange.from,
        to: occupancyRange.to,
        page: occupancyPage,
      }),
      getTableRecentSessionsPage({ tableId: id, page: sessionsPage }),
    ]);

  return {
    table,
    today,
    thisWeek,
    thisMonth,
    allTime,
    dailyOccupancy,
    occupancyRange,
    recentSessions,
  };
}

export type TableProfile = NonNullable<Awaited<ReturnType<typeof getTableProfile>>>;

export async function getActiveTableOptions() {
  return prisma.table.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export type OpenOrderCartView = {
  orderId: string;
  tableId: string | null;
  customerId: string | null;
  customerName: string;
  waiterId: string | null;
  waiterName: string | null;
  items: OpenOrderCartLine[];
};

/** Hydrates the Cafe Caisse cart screen for a table or takeaway ticket that
 * already has an open order — returns null when there's genuinely nothing
 * open yet (the screen then starts from an empty cart, same as this
 * function never having been called). */
export async function getOpenOrderCartView(
  orderId: string,
): Promise<OpenOrderCartView | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId, status: { in: ["PENDING", "PROCESSING"] } },
    include: {
      items: {
        include: { product: { select: { name: true } }, options: true },
        orderBy: { id: "asc" },
      },
      waiter: { select: { name: true } },
    },
  });
  if (!order) return null;

  return {
    orderId: order.id,
    tableId: order.tableId,
    customerId: order.customerId,
    customerName: order.customerName,
    waiterId: order.waiterId,
    waiterName: order.waiter?.name ?? null,
    items: order.items.map((line) => ({
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
    })),
  };
}

/** A table's current open order id, if any — the caisse table screen uses
 * this to know whether it's opening a fresh order or resuming one. */
export async function getOpenOrderIdForTable(tableId: string) {
  const order = await prisma.order.findFirst({
    where: { tableId, status: { in: ["PENDING", "PROCESSING"] } },
    select: { id: true },
  });
  return order?.id ?? null;
}

/** Open (uninvoiced) takeaway tickets — shown on the Caisse tables landing
 * page so a cashier can resume one instead of starting a new ticket. */
export async function getOpenTakeawayOrders() {
  const orders = await prisma.order.findMany({
    where: { type: "TAKEAWAY", tableId: null, status: { in: ["PENDING", "PROCESSING"] } },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      createdAt: true,
      waiter: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    total: order.total.toNumber(),
    createdAt: order.createdAt,
    waiterName: order.waiter?.name ?? null,
  }));
}
