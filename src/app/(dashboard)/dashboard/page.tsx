import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  Wallet,
  Warehouse,
  Receipt,
  TrendingUp,
  UserPlus,
  Truck,
  LayoutGrid,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { getDashboardStats } from "@/features/dashboard/queries";
import {
  getAnalyticsSummary,
  getRevenueTrend,
  getOrderStatusBreakdown,
  getPaymentStatusBreakdown,
  getTopProducts,
  getTopCustomers,
  getSalesByCategory,
  getExpensesByCategory,
} from "@/features/dashboard/analytics-queries";
import {
  getCafeDashboardStats,
  getCafeAnalyticsSummary,
  getCafeRevenueTrend,
  getCafeTopProducts,
  getCafeSalesByWaiter,
  getCafeOrderTypeBreakdown,
  getCafeOrderSourceBreakdown,
  getCafePeakHours,
} from "@/features/dashboard/cafe-queries";
import { resolveDateRange } from "@/features/dashboard/date-range";
import { AnalyticsFilterBar } from "@/features/dashboard/components/analytics-filter-bar";
import { RevenueTrendChart } from "@/features/dashboard/components/revenue-trend-chart";
import { PaymentStatusChart } from "@/features/dashboard/components/payment-status-chart";
import { CategorySalesChart } from "@/features/dashboard/components/category-sales-chart";
import { OrderStatusChart } from "@/features/dashboard/components/order-status-chart";
import { RankedListCard } from "@/features/dashboard/components/ranked-list-card";
import { ExpensesChart } from "@/features/dashboard/components/expenses-chart";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { hasPermission, getFirstAccessiblePath } from "@/lib/permissions";
import { hasFeature } from "@/lib/features";
import { getLocale, getDictionary } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  // This is also the page login lands everyone on, so a user without
  // DASHBOARD_VIEW must never dead-end here on the generic access-denied
  // screen — forward them straight to whichever page they actually do have
  // access to instead (same fallback the access-denied page's own "back"
  // link uses).
  if (!(await hasPermission("DASHBOARD_VIEW"))) {
    redirect(await getFirstAccessiblePath());
  }

  const params = await searchParams;
  const range = resolveDateRange(params);

  const [
    locale,
    t,
    stats,
    summary,
    trend,
    orderStatusBreakdown,
    paymentStatusBreakdown,
    topProducts,
    topCustomers,
    categorySales,
    expensesByCategory,
    cafeCaisseEnabled,
    customersEnabled,
  ] = await Promise.all([
    getLocale(),
    getDictionary(),
    getDashboardStats(),
    getAnalyticsSummary(range),
    getRevenueTrend(range),
    getOrderStatusBreakdown(range),
    getPaymentStatusBreakdown(range),
    getTopProducts(range),
    getTopCustomers(range),
    getSalesByCategory(range),
    getExpensesByCategory(range),
    hasFeature("CAFE_CAISSE"),
    hasFeature("CUSTOMERS"),
  ]);
  const cafeStats = cafeCaisseEnabled ? await getCafeDashboardStats() : null;
  const cafeAnalytics = cafeCaisseEnabled
    ? await Promise.all([
        getCafeAnalyticsSummary(range),
        getCafeRevenueTrend(range),
        getCafeTopProducts(range),
        getCafeSalesByWaiter(range),
        getCafeOrderTypeBreakdown(range),
        getCafeOrderSourceBreakdown(range),
        getCafePeakHours(range),
      ]).then(
        ([
          summary,
          trend,
          topProducts,
          salesByWaiter,
          orderTypeBreakdown,
          orderSourceBreakdown,
          peakHours,
        ]) => ({
          summary,
          trend,
          topProducts,
          salesByWaiter,
          orderTypeBreakdown,
          orderSourceBreakdown,
          peakHours,
        }),
      )
    : null;
  const totalExpenses = expensesByCategory.reduce(
    (sum, expense) => sum + expense.total,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.admin.dashboard}
        description={t.dashboard.description}
        icon={LayoutDashboard}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.dashboardCards.totalProducts}
          value={stats.totalProducts}
          icon={Package}
          locale={locale}
        />
        {customersEnabled && (
          <StatCard
            title={t.dashboardCards.totalCustomers}
            value={stats.totalCustomers}
            icon={Users}
            locale={locale}
          />
        )}
        <StatCard
          title={t.dashboardCards.orders}
          value={stats.activeOrders}
          icon={ShoppingCart}
          locale={locale}
        />
        <StatCard
          title={t.dashboardCards.lowStockProducts}
          value={stats.lowStockCount}
          icon={AlertTriangle}
          variant="warning"
          locale={locale}
          href="/dashboard/inventory/low-stock"
        />
        {customersEnabled && (
          <StatCard
            title={t.dashboardCards.totalOwedByCustomers}
            value={stats.totalOwedByCustomers}
            icon={Wallet}
            variant="warning"
            formatValue={(value) => formatCurrency(value, locale)}
          />
        )}
        <StatCard
          title={t.dashboardCards.totalInventoryPurchaseValue}
          value={stats.totalInventoryPurchaseValue}
          icon={Warehouse}
          formatValue={(value) => formatCurrency(value, locale)}
        />
      </div>

      {cafeStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title={t.dashboardCards.cafeOpenTables}
            value={cafeStats.openTablesCount}
            icon={LayoutGrid}
            locale={locale}
            href="/dashboard/tables"
          />
          <StatCard
            title={t.dashboardCards.cafeOpenOrders}
            value={cafeStats.openOrdersCount}
            icon={ShoppingCart}
            locale={locale}
          />
          <StatCard
            title={t.dashboardCards.cafeTodaySales}
            value={cafeStats.todaySalesTotal}
            icon={Wallet}
            formatValue={(value) => formatCurrency(value, locale)}
          />
        </div>
      )}

      <AnalyticsFilterBar basePath="/dashboard" range={range} t={t} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.dashboardCards.periodRevenue}
          value={summary.revenue}
          icon={TrendingUp}
          formatValue={(value) => formatCurrency(value, locale)}
        />
        <StatCard
          title={t.dashboardCards.periodInvoices}
          value={summary.invoiceCount}
          icon={Receipt}
          locale={locale}
        />
        <StatCard
          title={t.dashboardCards.periodOrders}
          value={summary.ordersCount}
          icon={ShoppingCart}
          locale={locale}
        />
        <StatCard
          title={t.dashboardCards.avgInvoice}
          value={summary.avgInvoice}
          icon={Wallet}
          formatValue={(value) => formatCurrency(value, locale)}
        />
        {customersEnabled && (
          <StatCard
            title={t.dashboardCards.newCustomers}
            value={summary.newCustomers}
            icon={UserPlus}
            locale={locale}
          />
        )}
        <StatCard
          title={t.dashboardCards.periodPurchases}
          value={summary.purchasesTotal}
          icon={Truck}
          formatValue={(value) => formatCurrency(value, locale)}
        />
        <StatCard
          title={t.dashboard.totalExpenses}
          value={totalExpenses}
          icon={Receipt}
          variant="warning"
          formatValue={(value) => formatCurrency(value, locale)}
        />
      </div>

      <RevenueTrendChart data={trend} />

      <div className={`grid gap-4 ${customersEnabled ? "lg:grid-cols-2" : ""}`}>
        <RankedListCard
          title={t.dashboard.topSelling}
          icon={Package}
          emptyLabel={t.dashboard.noSalesInPeriod}
          locale={locale}
          items={topProducts.map((product) => ({
            key: product.key,
            label: product.name,
            sublabel: `${product.quantity.toLocaleString(locale)} ${t.dashboard.unitSuffix}`,
            value: product.revenue,
          }))}
        />
        {customersEnabled && (
          <RankedListCard
            title={t.dashboard.topCustomers}
            icon={Users}
            emptyLabel={t.dashboard.noInvoicesInPeriod}
            locale={locale}
            items={topCustomers.map((customer) => ({
              key: customer.id,
              label: customer.name,
              sublabel: `${customer.invoiceCount.toLocaleString(locale)} ${t.dashboard.invoiceSuffix}`,
              value: customer.total,
              href: `/dashboard/customers/${customer.id}`,
            }))}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategorySalesChart data={categorySales} />
        <PaymentStatusChart data={paymentStatusBreakdown} />
        <OrderStatusChart data={orderStatusBreakdown} />
        <ExpensesChart data={expensesByCategory} />
      </div>

      {cafeAnalytics && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t.dashboard.cafeAnalyticsTitle}</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t.dashboardCards.cafePeriodRevenue}
              value={cafeAnalytics.summary.revenue}
              icon={TrendingUp}
              formatValue={(value) => formatCurrency(value, locale)}
            />
            <StatCard
              title={t.dashboardCards.cafeInvoiceCount}
              value={cafeAnalytics.summary.invoiceCount}
              icon={Receipt}
              locale={locale}
            />
            <StatCard
              title={t.dashboardCards.cafeAvgInvoice}
              value={cafeAnalytics.summary.avgInvoice}
              icon={Wallet}
              formatValue={(value) => formatCurrency(value, locale)}
            />
            <StatCard
              title={t.dashboardCards.cafeQrConversion}
              value={cafeAnalytics.summary.qrConversionPct}
              icon={LayoutGrid}
              formatValue={(value) => `${value.toFixed(0)}%`}
            />
          </div>

          <RevenueTrendChart data={cafeAnalytics.trend} />

          <div className="grid gap-4 lg:grid-cols-2">
            <RankedListCard
              title={t.dashboard.cafeTopProductsTitle}
              icon={Package}
              emptyLabel={t.dashboard.noSalesInPeriod}
              locale={locale}
              items={cafeAnalytics.topProducts.map((product) => ({
                key: product.key,
                label: product.name,
                sublabel: `${product.quantity.toLocaleString(locale)} ${t.dashboard.unitSuffix}`,
                value: product.revenue,
              }))}
            />
            <RankedListCard
              title={t.dashboard.cafeSalesByWaiterTitle}
              icon={Users}
              emptyLabel={t.dashboard.noSalesInPeriod}
              locale={locale}
              items={cafeAnalytics.salesByWaiter.map((staff) => ({
                key: staff.key,
                label: staff.name || t.dashboard.cafeUnassignedWaiter,
                sublabel: `${staff.orderCount.toLocaleString(locale)} ${t.dashboard.orderSuffix}`,
                value: staff.revenue,
              }))}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <RankedListCard
              title={t.dashboard.cafeOrderTypeTitle}
              icon={ShoppingCart}
              emptyLabel={t.dashboard.noSalesInPeriod}
              locale={locale}
              items={cafeAnalytics.orderTypeBreakdown.map((entry) => ({
                key: entry.key,
                label:
                  entry.key === "DINE_IN"
                    ? t.dashboard.cafeDineInLabel
                    : t.dashboard.cafeTakeawayLabel,
                sublabel: `${entry.count.toLocaleString(locale)} ${t.dashboard.orderSuffix}`,
                value: entry.revenue,
              }))}
            />
            <RankedListCard
              title={t.dashboard.cafeOrderSourceTitle}
              icon={ShoppingCart}
              emptyLabel={t.dashboard.noSalesInPeriod}
              locale={locale}
              items={cafeAnalytics.orderSourceBreakdown.map((entry) => ({
                key: entry.key,
                label:
                  entry.key === "QR" ? t.dashboard.cafeQrSourceLabel : t.dashboard.cafeStaffSourceLabel,
                sublabel: `${entry.count.toLocaleString(locale)} ${t.dashboard.orderSuffix}`,
                value: entry.revenue,
              }))}
            />
            <RankedListCard
              title={t.dashboard.cafePeakHoursTitle}
              icon={TrendingUp}
              emptyLabel={t.dashboard.noSalesInPeriod}
              locale={locale}
              items={cafeAnalytics.peakHours.slice(0, 8).map((entry) => ({
                key: String(entry.hour),
                label: `${String(entry.hour).padStart(2, "0")}:00`,
                value: entry.revenue,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
