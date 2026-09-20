import { notFound } from "next/navigation";
import { ShoppingCart, Wallet, Receipt, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/shared/back-button";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerAvatar } from "@/components/shared/customer-avatar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { getWaiterProfile } from "@/features/waiters/queries";
import { requirePageAccess } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import { getDictionary, getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function WaiterProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ordersPage?: string }>;
}) {
  await requirePageAccess("ORDERS_VIEW");
  await requireFeature("WAITERS");

  const { id } = await params;
  const sp = await searchParams;
  const ordersPage = Math.max(1, Number(sp.ordersPage) || 1);

  const [t, locale, profile] = await Promise.all([
    getDictionary(),
    getLocale(),
    getWaiterProfile(id, ordersPage),
  ]);
  if (!profile) notFound();

  const {
    waiter,
    today,
    thisWeek,
    thisMonth,
    allTime,
    recentOrders,
    recentOrdersTotal,
    recentOrdersPageSize,
  } = profile;

  const typeLabel = (type: "RETAIL" | "DINE_IN" | "TAKEAWAY") =>
    type === "DINE_IN"
      ? t.dashboard.cafeDineInLabel
      : type === "TAKEAWAY"
        ? t.dashboard.cafeTakeawayLabel
        : type;

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/dashboard/waiters" />

      <div className="flex items-center gap-4">
        <CustomerAvatar
          name={waiter.name}
          imageUrl={waiter.imageUrl}
          seed={waiter.id}
          className="size-16 text-xl"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{waiter.name}</h1>
            {!waiter.isActive && (
              <Badge variant="secondary">{t.waiters.statusInactive}</Badge>
            )}
          </div>
          {waiter.phone && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              <span dir="ltr">{waiter.phone}</span>
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.waiters.profile.ordersTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t.waiters.profile.today}
              value={today.orderCount}
              icon={ShoppingCart}
              locale={locale}
            />
            <StatCard
              title={t.waiters.profile.thisWeek}
              value={thisWeek.orderCount}
              icon={ShoppingCart}
              locale={locale}
            />
            <StatCard
              title={t.waiters.profile.thisMonth}
              value={thisMonth.orderCount}
              icon={ShoppingCart}
              locale={locale}
            />
            <StatCard
              title={t.waiters.profile.allTime}
              value={allTime.orderCount}
              icon={ShoppingCart}
              locale={locale}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.waiters.profile.revenueTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t.waiters.profile.today}
              value={today.revenue}
              icon={Wallet}
              formatValue={(value) => formatCurrency(value, locale)}
            />
            <StatCard
              title={t.waiters.profile.thisWeek}
              value={thisWeek.revenue}
              icon={Wallet}
              formatValue={(value) => formatCurrency(value, locale)}
            />
            <StatCard
              title={t.waiters.profile.thisMonth}
              value={thisMonth.revenue}
              icon={Wallet}
              formatValue={(value) => formatCurrency(value, locale)}
            />
            <StatCard
              title={t.waiters.profile.allTime}
              value={allTime.revenue}
              icon={Wallet}
              formatValue={(value) => formatCurrency(value, locale)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.waiters.profile.recentOrdersTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentOrders.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t.waiters.profile.noRecentOrders}
            />
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.invoiceId}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium">{order.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel(order.type)}
                      {order.tableName ? ` · ${order.tableName}` : ""}
                      {" · "}
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">
                    {formatCurrency(order.total, locale)}
                  </p>
                </div>
              ))}
            </div>
          )}
          {recentOrdersTotal > 0 && (
            <DataTablePagination
              page={ordersPage}
              pageSize={recentOrdersPageSize}
              total={recentOrdersTotal}
              basePath={`/dashboard/waiters/${id}`}
              pageParam="ordersPage"
              searchParams={{}}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
