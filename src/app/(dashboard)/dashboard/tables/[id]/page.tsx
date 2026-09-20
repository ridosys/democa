import { notFound } from "next/navigation";
import { LayoutGrid, Users, Wallet, CalendarClock, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { BackButton } from "@/components/shared/back-button";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { TableOccupancyRangeFilter } from "@/features/tables/components/table-occupancy-range-filter";
import { getTableProfile } from "@/features/tables/queries";
import { requirePageAccess } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { formatCurrency } from "@/lib/currency";
import { formatDate, formatDateTime, parseDateInputValue, toDateInputValue } from "@/lib/date";
import { formatMessage } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function TableProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    sessionsPage?: string;
    occupancyFrom?: string;
    occupancyTo?: string;
    occupancyPage?: string;
  }>;
}) {
  await requirePageAccess("ORDERS_VIEW");
  await requireFeature("TABLES");

  const { id } = await params;
  const sp = await searchParams;
  const sessionsPage = Math.max(1, Number(sp.sessionsPage) || 1);
  const occupancyPage = Math.max(1, Number(sp.occupancyPage) || 1);
  const occupancyFrom = sp.occupancyFrom ? parseDateInputValue(sp.occupancyFrom) : undefined;
  const occupancyTo = sp.occupancyTo ? parseDateInputValue(sp.occupancyTo) : undefined;

  const [t, locale, profile] = await Promise.all([
    getDictionary(),
    getLocale(),
    getTableProfile(id, { sessionsPage, occupancyFrom, occupancyTo, occupancyPage }),
  ]);
  if (!profile) notFound();

  const {
    table,
    today,
    thisWeek,
    thisMonth,
    allTime,
    dailyOccupancy,
    occupancyRange,
    recentSessions,
  } = profile;
  const maxDailySessions = Math.max(1, ...dailyOccupancy.items.map((day) => day.sessionCount));

  return (
    <div className="space-y-6">
      <PageHeader
        title={table.name}
        icon={LayoutGrid}
        description={t.tables.profileLabel}
        action={<BackButton fallbackHref="/dashboard/tables" />}
      />

      <div className="flex items-center gap-2">
        {table.seats != null && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-4" />
            {t.tables.profile.seatsLabel} · {table.seats}
          </p>
        )}
        {!table.isActive && <Badge variant="secondary">{t.tables.statusInactive}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.tables.profile.sessionsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t.tables.profile.today}
              value={today.sessionCount}
              icon={History}
              locale={locale}
            />
            <StatCard
              title={t.tables.profile.thisWeek}
              value={thisWeek.sessionCount}
              icon={History}
              locale={locale}
            />
            <StatCard
              title={t.tables.profile.thisMonth}
              value={thisMonth.sessionCount}
              icon={History}
              locale={locale}
            />
            <StatCard
              title={t.tables.profile.allTime}
              value={allTime.sessionCount}
              icon={History}
              locale={locale}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.tables.profile.revenueTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t.tables.profile.today}
              value={today.revenue}
              icon={Wallet}
              formatValue={(value) => formatCurrency(value, locale)}
            />
            <StatCard
              title={t.tables.profile.thisWeek}
              value={thisWeek.revenue}
              icon={Wallet}
              formatValue={(value) => formatCurrency(value, locale)}
            />
            <StatCard
              title={t.tables.profile.thisMonth}
              value={thisMonth.revenue}
              icon={Wallet}
              formatValue={(value) => formatCurrency(value, locale)}
            />
            <StatCard
              title={t.tables.profile.allTime}
              value={allTime.revenue}
              icon={Wallet}
              formatValue={(value) => formatCurrency(value, locale)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle>{t.tables.profile.dailyOccupancyTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t.tables.profile.dailyOccupancyDescription}
            </p>
          </div>
          <TableOccupancyRangeFilter
            from={toDateInputValue(occupancyRange.from)}
            to={toDateInputValue(occupancyRange.to)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            {dailyOccupancy.items.map((day) => (
              <div
                key={day.day.toISOString()}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-24 shrink-0 text-muted-foreground">
                  {formatDate(day.day)}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(day.sessionCount / maxDailySessions) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-end font-medium tabular-nums">
                  {day.sessionCount > 0
                    ? formatMessage(t.tables.profile.sessionsCountTemplate, {
                        count: day.sessionCount,
                      })
                    : t.tables.profile.noSessionsOnDay}
                </span>
              </div>
            ))}
          </div>
          <DataTablePagination
            page={occupancyPage}
            pageSize={dailyOccupancy.pageSize}
            total={dailyOccupancy.total}
            basePath={`/dashboard/tables/${id}`}
            pageParam="occupancyPage"
            searchParams={{
              sessionsPage: sp.sessionsPage,
              occupancyFrom: sp.occupancyFrom,
              occupancyTo: sp.occupancyTo,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.tables.profile.recentSessionsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentSessions.items.length === 0 ? (
            <EmptyState icon={CalendarClock} title={t.tables.profile.noRecentSessions} />
          ) : (
            <div className="space-y-2">
              {recentSessions.items.map((session) => (
                <div
                  key={session.orderId}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium">{session.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.waiterName ?? "—"}
                      {" · "}
                      {formatDateTime(session.createdAt)}
                      {" · "}
                      {session.durationMinutes != null ? (
                        formatMessage(t.tables.profile.durationMinutesTemplate, {
                          minutes: session.durationMinutes,
                        })
                      ) : (
                        <span className="text-primary">{t.tables.profile.openSessionLabel}</span>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">
                    {formatCurrency(session.total, locale)}
                  </p>
                </div>
              ))}
            </div>
          )}
          {recentSessions.total > 0 && (
            <DataTablePagination
              page={sessionsPage}
              pageSize={recentSessions.pageSize}
              total={recentSessions.total}
              basePath={`/dashboard/tables/${id}`}
              pageParam="sessionsPage"
              searchParams={{
                occupancyFrom: sp.occupancyFrom,
                occupancyTo: sp.occupancyTo,
                occupancyPage: sp.occupancyPage,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
