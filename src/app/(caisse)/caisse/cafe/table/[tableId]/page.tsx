import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSystemSettings } from "@/features/settings/queries";
import { getPosCategoriesPage, getPosProducts } from "@/features/pos/queries";
import {
  getTableById,
  getOpenOrderIdForTable,
  getOpenOrderCartView,
} from "@/features/tables/queries";
import { OpenOrderWorkspace } from "@/features/tables/components/open-order-workspace";
import { getWaiterById } from "@/features/waiters/queries";
import { requirePageAccess, canAccessDashboard } from "@/lib/permissions";
import { requireFeature, hasFeature } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function CaisseTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ waiter?: string }>;
}) {
  await requirePageAccess("POS_VIEW");
  await requireFeature("CAFE_CAISSE");
  await requireFeature("TABLES");

  const { tableId } = await params;
  const { waiter: waiterParam } = await searchParams;

  const table = await getTableById(tableId);
  if (!table) notFound();

  const [session, settings, categories, products, openOrderId, canDashboard, waitersEnabled] =
    await Promise.all([
      auth(),
      getSystemSettings(),
      getPosCategoriesPage(),
      getPosProducts({}),
      getOpenOrderIdForTable(tableId),
      canAccessDashboard(),
      hasFeature("WAITERS"),
    ]);

  const cart = openOrderId ? await getOpenOrderCartView(openOrderId) : null;
  const waiterId = cart?.waiterId ?? waiterParam ?? null;
  if (waitersEnabled && !waiterId) redirect(`/caisse/cafe/table/${tableId}/waiter`);
  const waiterName =
    cart?.waiterName ?? (waiterParam ? (await getWaiterById(waiterParam))?.name ?? null : null);

  return (
    <OpenOrderWorkspace
      adminName={session?.user?.name ?? ""}
      logoUrl={settings.logoUrl}
      canDashboard={canDashboard}
      mode="DINE_IN"
      tableId={table.id}
      tableName={table.name}
      initialOrderId={cart?.orderId ?? null}
      initialItems={cart?.items ?? []}
      initialCategories={categories}
      initialProducts={products}
      waiterId={waitersEnabled ? waiterId : null}
      waiterName={waitersEnabled ? waiterName : null}
      changeWaiterHref={waitersEnabled ? `/caisse/cafe/table/${tableId}/waiter` : null}
    />
  );
}
