import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSystemSettings } from "@/features/settings/queries";
import { getPosCategoriesPage, getPosProducts } from "@/features/pos/queries";
import { getOpenOrderCartView } from "@/features/tables/queries";
import { getWaiterById } from "@/features/waiters/queries";
import { OpenOrderWorkspace } from "@/features/tables/components/open-order-workspace";
import { requirePageAccess, canAccessDashboard } from "@/lib/permissions";
import { requireFeature, hasFeature } from "@/lib/features";

export const dynamic = "force-dynamic";

/**
 * `orderId` may be a real, already-open takeaway order (resumed from the
 * tables landing page's list) or a fresh client-generated id with no
 * matching order yet (a brand-new "New takeaway" ticket) — either way this
 * page just tries to hydrate from it and falls back to an empty cart; the
 * first item added mints the real order via addItemToOpenOrder.
 */
export default async function CaisseTakeawayPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ waiter?: string }>;
}) {
  await requirePageAccess("POS_VIEW");
  await requireFeature("CAFE_CAISSE");
  await requireFeature("OPEN_ORDERS");

  const { orderId } = await params;
  const { waiter: waiterParam } = await searchParams;

  const [session, settings, categories, products, cart, canDashboard, waitersEnabled] =
    await Promise.all([
      auth(),
      getSystemSettings(),
      getPosCategoriesPage(),
      getPosProducts({}),
      getOpenOrderCartView(orderId),
      canAccessDashboard(),
      hasFeature("WAITERS"),
    ]);

  const waiterId = cart?.waiterId ?? waiterParam ?? null;
  if (waitersEnabled && !waiterId) redirect(`/caisse/cafe/takeaway/${orderId}/waiter`);
  const waiterName =
    cart?.waiterName ?? (waiterParam ? (await getWaiterById(waiterParam))?.name ?? null : null);

  return (
    <OpenOrderWorkspace
      adminName={session?.user?.name ?? ""}
      logoUrl={settings.logoUrl}
      canDashboard={canDashboard}
      mode="TAKEAWAY"
      initialOrderId={cart?.orderId ?? null}
      initialItems={cart?.items ?? []}
      initialCategories={categories}
      initialProducts={products}
      waiterId={waitersEnabled ? waiterId : null}
      waiterName={waitersEnabled ? waiterName : null}
      changeWaiterHref={waitersEnabled ? `/caisse/cafe/takeaway/${orderId}/waiter` : null}
      printMethod={settings.printMethod}
    />
  );
}
