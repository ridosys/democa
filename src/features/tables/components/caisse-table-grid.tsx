"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { getTablesWithOpenOrders } from "@/features/tables/queries";

type TableRow = Awaited<ReturnType<typeof getTablesWithOpenOrders>>[number];

export function CaisseTableGrid({ tables }: { tables: TableRow[] }) {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {tables
        .filter((table) => table.isActive)
        .map((table) => {
          const occupied = Boolean(table.openOrder);
          return (
            <Link key={table.id} href={`/caisse/cafe/table/${table.id}`}>
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                  occupied ? "border-destructive/40" : "border-primary/30",
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">{table.name}</CardTitle>
                  <Badge variant={occupied ? "destructive" : "default"}>
                    {occupied ? t.tables.statusOccupied : t.tables.statusAvailable}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {table.seats != null && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="size-4" />
                      {table.seats}
                    </p>
                  )}
                  {table.openOrder?.waiterName && (
                    <p className="truncate text-xs text-muted-foreground">
                      {table.openOrder.waiterName}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
    </div>
  );
}
