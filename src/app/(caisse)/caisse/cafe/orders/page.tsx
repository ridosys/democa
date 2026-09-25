import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";
import { AccountMenu } from "@/components/shared/account-menu";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { FullscreenToggle } from "@/components/shared/fullscreen-toggle";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getSystemSettings } from "@/features/settings/queries";
import {
  getCheckedOutCafeOrders,
  getCheckedOutCafeOrdersSummary,
} from "@/features/tables/queries";
import { CafeOrdersList } from "@/features/tables/components/cafe-orders-list";
import { CafeOrdersDateFilter } from "@/features/tables/components/cafe-orders-date-filter";
import { requirePageAccess, canAccessDashboard } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/format";
import { formatCurrency } from "@/lib/currency";
import { parseDateInputValue, toDateInputValue } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function CaisseCafeOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requirePageAccess("POS_VIEW");
  await requireFeature("CAFE_CAISSE");

  const requested = await searchParams;
  const date =
    requested.date && /^\d{4}-\d{2}-\d{2}$/.test(requested.date)
      ? requested.date
      : toDateInputValue(new Date());

  const day = parseDateInputValue(date);
  const [t, locale, session, settings, canDashboard, firstPage, summary] = await Promise.all([
    getDictionary(),
    getLocale(),
    auth(),
    getSystemSettings(),
    canAccessDashboard(),
    getCheckedOutCafeOrders(day),
    getCheckedOutCafeOrdersSummary(day),
  ]);
  const to = t.tables.caisse.orders;

  return (
    <div className="min-h-dvh space-y-4 pb-6">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/caisse/cafe" aria-label={t.tables.caisse.backToTables} />}
        >
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Button>
        <BrandMark size="sm" logoUrl={settings.logoUrl} />
        <h1 className="truncate text-sm font-semibold">{to.title}</h1>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <FullscreenToggle />
          <LocaleSwitcher />
          <AccountMenu adminName={session?.user?.name ?? ""} canDashboard={canDashboard} />
        </div>
      </header>

      <div className="space-y-4 px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{to.description}</p>
            <p className="mt-1 text-sm font-semibold">
              {formatMessage(to.countTemplate, { count: summary.count })} ·{" "}
              {formatMessage(to.totalTemplate, { total: formatCurrency(summary.total, locale) })}
            </p>
          </div>
          <CafeOrdersDateFilter date={date} label={to.dateLabel} />
        </div>

        <CafeOrdersList
          key={`${date}:${summary.count}:${summary.total}`}
          date={date}
          totalCount={summary.count}
          initialItems={firstPage.items}
          initialNextOffset={firstPage.nextOffset}
          printMethod={settings.printMethod}
        />
      </div>
    </div>
  );
}
