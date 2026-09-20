import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "@/features/dashboard/date-range";
import {
  truncExpr,
  bucketLabel,
  stepBucket,
  type TrendPoint,
} from "@/features/dashboard/analytics-queries";

function bounds(range: ResolvedRange) {
  return { from: range.from ?? new Date(0), to: range.to };
}

export async function getCafeDashboardStats() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [openTablesCount, openOrdersCount, todaySales] = await Promise.all([
    prisma.table.count({
      where: {
        isActive: true,
        orders: { some: { status: { in: ["PENDING", "PROCESSING"] } } },
      },
    }),
    prisma.order.count({
      where: {
        type: { in: ["DINE_IN", "TAKEAWAY"] },
        status: { in: ["PENDING", "PROCESSING"] },
      },
    }),
    prisma.invoice.aggregate({
      where: {
        order: { type: { in: ["DINE_IN", "TAKEAWAY"] } },
        createdAt: { gte: startOfToday },
      },
      _sum: { total: true },
    }),
  ]);

  return {
    openTablesCount,
    openOrdersCount,
    todaySalesTotal: Number(todaySales._sum.total ?? 0),
  };
}

export type CafeAnalyticsSummary = {
  revenue: number;
  invoiceCount: number;
  avgInvoice: number;
  qrConversionPct: number;
};

export async function getCafeAnalyticsSummary(
  range: ResolvedRange,
): Promise<CafeAnalyticsSummary> {
  const { from, to } = bounds(range);

  const [itemAgg, requestCounts] = await Promise.all([
    prisma.$queryRaw<{ revenue: string; invoiceCount: bigint }[]>`
      SELECT COALESCE(SUM(ii.quantity * ii."unitPrice"), 0)::numeric as revenue,
        COUNT(DISTINCT i.id)::bigint as "invoiceCount"
      FROM public."InvoiceItem" ii
      JOIN public."Invoice" i ON i.id = ii."invoiceId"
      JOIN public."Order" o ON o.id = i."orderId"
      WHERE i."createdAt" BETWEEN ${from} AND ${to} AND o.type IN ('DINE_IN', 'TAKEAWAY')
    `,
    prisma.cafeOrderRequest.groupBy({
      by: ["status"],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
  ]);

  const revenue = Number(itemAgg[0]?.revenue ?? 0);
  const invoiceCount = Number(itemAgg[0]?.invoiceCount ?? 0);
  const totalRequests = requestCounts.reduce(
    (sum, r) => sum + r._count._all,
    0,
  );
  const acceptedRequests =
    requestCounts.find((r) => r.status === "ACCEPTED")?._count._all ?? 0;

  return {
    revenue,
    invoiceCount,
    avgInvoice: invoiceCount > 0 ? revenue / invoiceCount : 0,
    qrConversionPct:
      totalRequests > 0 ? (acceptedRequests / totalRequests) * 100 : 0,
  };
}

export async function getCafeRevenueTrend(
  range: ResolvedRange,
): Promise<TrendPoint[]> {
  const { from, to } = bounds(range);
  const { granularity } = range;

  const rows = await prisma.$queryRaw<{ bucket: Date; total: string }[]>`
    SELECT ${truncExpr(granularity, 'i."createdAt"')} as bucket, COALESCE(SUM(i.total), 0)::numeric as total
    FROM public."Invoice" i
    JOIN public."Order" o ON o.id = i."orderId"
    WHERE i."createdAt" BETWEEN ${from} AND ${to} AND o.type IN ('DINE_IN', 'TAKEAWAY')
    GROUP BY bucket
    ORDER BY bucket
  `;

  const salesMap = new Map(
    rows.map((r) => [r.bucket.toISOString(), Number(r.total)]),
  );
  const keys = new Set(salesMap.keys());

  if (range.from) {
    let cursor = new Date(range.from);
    if (granularity === "hour") cursor.setUTCMinutes(0, 0, 0);
    else cursor.setUTCHours(0, 0, 0, 0);
    while (cursor <= to) {
      keys.add(cursor.toISOString());
      cursor = stepBucket(cursor, granularity);
    }
  }

  return [...keys].sort().map((key) => {
    const date = new Date(key);
    return {
      bucket: key,
      label: bucketLabel(date, granularity),
      sales: salesMap.get(key) ?? 0,
      purchases: 0,
    };
  });
}

export type CafePeakHour = { hour: number; revenue: number };

export async function getCafePeakHours(
  range: ResolvedRange,
): Promise<CafePeakHour[]> {
  const { from, to } = bounds(range);
  const rows = await prisma.$queryRaw<{ hour: number; revenue: string }[]>`
    SELECT EXTRACT(HOUR FROM i."createdAt")::int as hour,
      COALESCE(SUM(ii.quantity * ii."unitPrice"), 0)::numeric as revenue
    FROM public."InvoiceItem" ii
    JOIN public."Invoice" i ON i.id = ii."invoiceId"
    JOIN public."Order" o ON o.id = i."orderId"
    WHERE i."createdAt" BETWEEN ${from} AND ${to} AND o.type IN ('DINE_IN', 'TAKEAWAY')
    GROUP BY hour
    ORDER BY revenue DESC
  `;
  return rows.map((r) => ({ hour: r.hour, revenue: Number(r.revenue) }));
}

export type CafeTopProduct = {
  key: string;
  name: string;
  quantity: number;
  revenue: number;
};

export async function getCafeTopProducts(
  range: ResolvedRange,
  limit = 8,
): Promise<CafeTopProduct[]> {
  const { from, to } = bounds(range);
  const rows = await prisma.$queryRaw<
    { key: string; name: string; quantity: string; revenue: string }[]
  >`
    SELECT COALESCE(ii."productId", ii.name) as key, MIN(ii.name) as name,
      SUM(ii.quantity)::numeric as quantity,
      SUM(ii.quantity * ii."unitPrice")::numeric as revenue
    FROM public."InvoiceItem" ii
    JOIN public."Invoice" i ON i.id = ii."invoiceId"
    JOIN public."Order" o ON o.id = i."orderId"
    WHERE i."createdAt" BETWEEN ${from} AND ${to} AND o.type IN ('DINE_IN', 'TAKEAWAY')
    GROUP BY key
    ORDER BY revenue DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    key: r.key,
    name: r.name,
    quantity: Number(r.quantity),
    revenue: Number(r.revenue),
  }));
}

export type CafeWaiterSales = {
  key: string;
  name: string;
  orderCount: number;
  revenue: number;
};

export async function getCafeSalesByWaiter(
  range: ResolvedRange,
  limit = 8,
): Promise<CafeWaiterSales[]> {
  const { from, to } = bounds(range);
  const rows = await prisma.$queryRaw<
    { key: string; name: string | null; orderCount: bigint; revenue: string }[]
  >`
    SELECT COALESCE(o."waiterId", 'unassigned') as key, w.name as name,
      COUNT(DISTINCT i.id)::bigint as "orderCount",
      COALESCE(SUM(i.total), 0)::numeric as revenue
    FROM public."Invoice" i
    JOIN public."Order" o ON o.id = i."orderId"
    LEFT JOIN public."Waiter" w ON w.id = o."waiterId"
    WHERE i."createdAt" BETWEEN ${from} AND ${to} AND o.type IN ('DINE_IN', 'TAKEAWAY')
    GROUP BY key, w.name
    ORDER BY revenue DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    key: r.key,
    name: r.name ?? "",
    orderCount: Number(r.orderCount),
    revenue: Number(r.revenue),
  }));
}

export type CafeBreakdownEntry = {
  key: string;
  count: number;
  revenue: number;
};

export async function getCafeOrderTypeBreakdown(
  range: ResolvedRange,
): Promise<CafeBreakdownEntry[]> {
  const { from, to } = bounds(range);
  const rows = await prisma.$queryRaw<
    { key: string; count: bigint; revenue: string }[]
  >`
    SELECT o.type as key, COUNT(DISTINCT i.id)::bigint as count,
      COALESCE(SUM(i.total), 0)::numeric as revenue
    FROM public."Invoice" i
    JOIN public."Order" o ON o.id = i."orderId"
    WHERE i."createdAt" BETWEEN ${from} AND ${to} AND o.type IN ('DINE_IN', 'TAKEAWAY')
    GROUP BY o.type
  `;
  return rows.map((r) => ({
    key: r.key,
    count: Number(r.count),
    revenue: Number(r.revenue),
  }));
}

export async function getCafeOrderSourceBreakdown(
  range: ResolvedRange,
): Promise<CafeBreakdownEntry[]> {
  const { from, to } = bounds(range);
  const rows = await prisma.$queryRaw<
    { key: string; count: bigint; revenue: string }[]
  >`
    SELECT o.source as key, COUNT(DISTINCT i.id)::bigint as count,
      COALESCE(SUM(i.total), 0)::numeric as revenue
    FROM public."Invoice" i
    JOIN public."Order" o ON o.id = i."orderId"
    WHERE i."createdAt" BETWEEN ${from} AND ${to} AND o.type IN ('DINE_IN', 'TAKEAWAY')
    GROUP BY o.source
  `;
  return rows.map((r) => ({
    key: r.key,
    count: Number(r.count),
    revenue: Number(r.revenue),
  }));
}
