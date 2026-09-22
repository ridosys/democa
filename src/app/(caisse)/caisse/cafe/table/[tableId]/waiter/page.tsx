import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/shared/brand-mark";
import { AccountMenu } from "@/components/shared/account-menu";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { FullscreenToggle } from "@/components/shared/fullscreen-toggle";
import { getTableById, getOpenOrderIdForTable } from "@/features/tables/queries";
import { getActiveWaiters } from "@/features/waiters/queries";
import { getSystemSettings } from "@/features/settings/queries";
import { WaiterPickerGrid } from "@/features/waiters/components/waiter-picker-grid";
import { auth } from "@/lib/auth";
import { requirePageAccess, canAccessDashboard } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { getDictionary } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function CafeTableWaiterPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  await requirePageAccess("POS_VIEW");
  await requireFeature("CAFE_CAISSE");
  await requireFeature("TABLES");
  await requireFeature("WAITERS");

  const { tableId } = await params;

  const [t, session, settings, table, openOrderId, waiters, canDashboard] = await Promise.all([
    getDictionary(),
    auth(),
    getSystemSettings(),
    getTableById(tableId),
    getOpenOrderIdForTable(tableId),
    getActiveWaiters(),
    canAccessDashboard(),
  ]);
  if (!table) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/caisse/cafe" />}
        >
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Button>
        <BrandMark size="sm" logoUrl={settings.logoUrl} />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{t.waiters.pickerTitle}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {t.tables.caisse.tableLabel} {table.name}
          </p>
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <FullscreenToggle />
          <LocaleSwitcher />
          <AccountMenu adminName={session?.user?.name ?? ""} canDashboard={canDashboard} />
        </div>
      </header>
      <div className="space-y-6 p-4">
        <WaiterPickerGrid
          waiters={waiters}
          orderId={openOrderId}
          workspaceHref={`/caisse/cafe/table/${tableId}`}
        />
      </div>
    </div>
  );
}
