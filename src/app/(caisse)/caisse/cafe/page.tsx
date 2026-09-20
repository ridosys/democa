import Link from "next/link";
import { LayoutGrid, ShoppingBag } from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";
import { AccountMenu } from "@/components/shared/account-menu";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getSystemSettings } from "@/features/settings/queries";
import {
  getTablesWithOpenOrders,
  getOpenTakeawayOrders,
} from "@/features/tables/queries";
import { getPendingCafeOrderRequests } from "@/features/cafe-order-requests/queries";
import { IncomingOrdersPanel } from "@/features/cafe-order-requests/components/incoming-orders-panel";
import { CaisseTableGrid } from "@/features/tables/components/caisse-table-grid";
import { NewTakeawayButton } from "@/features/tables/components/new-takeaway-button";
import { requirePageAccess, canAccessDashboard } from "@/lib/permissions";
import { requireFeature, hasFeature } from "@/lib/features";
import { getDictionary } from "@/i18n/server";
import { formatCurrency } from "@/lib/currency";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function CaisseTablesPage() {
  await requirePageAccess("POS_VIEW");
  await requireFeature("CAFE_CAISSE");

  const [
    t,
    locale,
    session,
    settings,
    canDashboard,
    tablesEnabled,
    takeawayOrders,
    incomingRequests,
  ] = await Promise.all([
    getDictionary(),
    getLocale(),
    auth(),
    getSystemSettings(),
    canAccessDashboard(),
    hasFeature("TABLES"),
    getOpenTakeawayOrders(),
    getPendingCafeOrderRequests(),
  ]);
  const tables = tablesEnabled ? await getTablesWithOpenOrders() : [];

  return (
    <div className="min-h-dvh space-y-6 pb-6">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <div className="flex shrink-0 items-center gap-2">
          <BrandMark size="md" logoUrl={settings.logoUrl} />
          <span className="hidden text-sm font-bold tracking-wide sm:inline">
            {t.admin.cafeCaisse}
          </span>
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <NewTakeawayButton label={t.tables.caisse.newTakeawayButton} />
          <LocaleSwitcher />
          <AccountMenu adminName={session?.user?.name ?? ""} canDashboard={canDashboard} />
        </div>
      </header>

      <div className="space-y-6 px-4 pt-4">
        <IncomingOrdersPanel requests={incomingRequests} />

        {tablesEnabled && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <LayoutGrid className="size-4" />
              {t.admin.tables}
            </h2>
            <CaisseTableGrid tables={tables} />
          </section>
        )}

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ShoppingBag className="size-4" />
            {t.tables.caisse.openTakeawayOrdersTitle}
          </h2>
          {takeawayOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.tables.caisse.noOpenTakeawayOrders}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {takeawayOrders.map((order) => (
                <Link key={order.id} href={`/caisse/cafe/takeaway/${order.id}`}>
                  <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
                    <CardContent className="space-y-1 pt-6">
                      <p className="text-sm font-semibold">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(order.total, locale)}
                      </p>
                      {order.waiterName && (
                        <p className="truncate text-xs text-muted-foreground">
                          {order.waiterName}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
