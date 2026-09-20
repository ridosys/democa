import Link from "next/link";
import { Plus, Contact } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getWaitersPage, getWaiterById } from "@/features/waiters/queries";
import { WaitersGrid } from "@/features/waiters/components/waiters-grid";
import { WaiterFormSheet } from "@/features/waiters/components/waiter-form-sheet";
import { requirePageAccess } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { getDictionary } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function WaitersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>;
}) {
  await requirePageAccess("ORDERS_VIEW");
  await requireFeature("WAITERS");

  const params = await searchParams;

  const [t, { items: waiters }, editingWaiter] = await Promise.all([
    getDictionary(),
    getWaitersPage({ page: 1 }),
    params.edit ? getWaiterById(params.edit) : Promise.resolve(null),
  ]);

  const isSheetOpen = params.new === "1" || Boolean(params.edit);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.admin.waiters}
        icon={Contact}
        action={
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/waiters?new=1" />}
          >
            <Plus className="size-4" />
            {t.waiters.addButton}
          </Button>
        }
      />
      {waiters.length === 0 ? (
        <EmptyState
          icon={Contact}
          title={t.waiters.emptyTitle}
          description={t.waiters.emptyDescription}
        />
      ) : (
        <WaitersGrid waiters={waiters} />
      )}
      <WaiterFormSheet
        key={editingWaiter?.id ?? (params.new ? "new" : "closed")}
        open={isSheetOpen}
        waiter={editingWaiter}
      />
    </div>
  );
}
