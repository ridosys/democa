import Link from "next/link";
import { Plus, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getTablesWithOpenOrders, getTableById } from "@/features/tables/queries";
import { TablesGrid } from "@/features/tables/components/tables-grid";
import { TableFormSheet } from "@/features/tables/components/table-form-sheet";
import { requirePageAccess } from "@/lib/permissions";
import { requireFeature, hasFeature } from "@/lib/features";
import { getRequestOrigin } from "@/lib/request-origin";
import { getDictionary } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function TablesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>;
}) {
  await requirePageAccess("ORDERS_VIEW");
  await requireFeature("TABLES");

  const params = await searchParams;

  const [t, tables, editingTable, qrOrderingEnabled, origin] = await Promise.all([
    getDictionary(),
    getTablesWithOpenOrders(),
    params.edit ? getTableById(params.edit) : Promise.resolve(null),
    hasFeature("QR_ORDERING"),
    getRequestOrigin(),
  ]);

  const isSheetOpen = params.new === "1" || Boolean(params.edit);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.admin.tables}
        icon={LayoutGrid}
        action={
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/tables?new=1" />}
          >
            <Plus className="size-4" />
            {t.tables.addButton}
          </Button>
        }
      />
      {tables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={t.tables.emptyTitle}
          description={t.tables.emptyDescription}
        />
      ) : (
        <TablesGrid tables={tables} qrOrderingEnabled={qrOrderingEnabled} origin={origin} />
      )}
      <TableFormSheet
        key={editingTable?.id ?? (params.new ? "new" : "closed")}
        open={isSheetOpen}
        table={editingTable}
        qrOrderingEnabled={qrOrderingEnabled}
        origin={origin}
      />
    </div>
  );
}
