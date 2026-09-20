"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, Pencil, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { TableQrDialogButton } from "@/features/tables/components/table-qr-dialog-button";
import { deleteTable } from "@/features/tables/actions";
import { useLocale } from "@/i18n/locale-provider";
import type { getTablesWithOpenOrders } from "@/features/tables/queries";

type TableRow = Awaited<ReturnType<typeof getTablesWithOpenOrders>>[number];

export function TablesGrid({
  tables,
  qrOrderingEnabled,
  origin,
}: {
  tables: TableRow[];
  qrOrderingEnabled: boolean;
  origin: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  function editHref(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", id);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tables.map((table) => {
        const status = !table.isActive
          ? "inactive"
          : table.openOrder
            ? "occupied"
            : "available";

        return (
          <Card
            key={table.id}
            className={
              status === "occupied"
                ? "group border-destructive/40"
                : status === "inactive"
                  ? "group opacity-60"
                  : "group border-primary/30"
            }
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <Link
                href={`/dashboard/tables/${table.id}`}
                className="min-w-0 flex-1"
              >
                <CardTitle className="truncate text-base hover:underline">
                  {table.name}
                </CardTitle>
              </Link>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge
                  variant={
                    status === "occupied"
                      ? "destructive"
                      : status === "inactive"
                        ? "secondary"
                        : "default"
                  }
                >
                  {status === "occupied"
                    ? t.tables.statusOccupied
                    : status === "inactive"
                      ? t.tables.statusInactive
                      : t.tables.statusAvailable}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.tables.viewProfile}
                  className="cursor-pointer rounded-full text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                  nativeButton={false}
                  render={<Link href={`/dashboard/tables/${table.id}`} />}
                >
                  <ArrowUpRight className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {table.seats != null && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-4" />
                  {table.seats}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  nativeButton={false}
                  render={<Link href={editHref(table.id)} />}
                >
                  <Pencil className="size-4" />
                  {t.common.edit}
                </Button>
                {qrOrderingEnabled && (
                  <TableQrDialogButton
                    tableId={table.id}
                    tableName={table.name}
                    qrToken={table.qrToken}
                    qrEnabled={table.qrEnabled}
                    origin={origin}
                  />
                )}
                <ConfirmDeleteDialog
                  action={() => deleteTable(table.id)}
                  description={t.tables.deleteDescription}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
