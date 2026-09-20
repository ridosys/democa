import { notFound } from "next/navigation";
import {
  resolveTableByToken,
  getPublicMenuCategories,
  getPublicMenuProducts,
} from "@/features/public-menu/queries";
import { getSystemSettings } from "@/features/settings/queries";
import { PublicMenuView } from "@/features/public-menu/components/public-menu-view";
import { hasFeature } from "@/lib/features";
import { getDictionary } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getDictionary();
  return { title: t.publicMenu.menuTitle };
}

export default async function PublicOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [qrOrderingEnabled, table, categories, productFeed, settings] = await Promise.all([
    hasFeature("QR_ORDERING"),
    resolveTableByToken(token),
    getPublicMenuCategories(),
    getPublicMenuProducts({}),
    getSystemSettings(),
  ]);
  if (!qrOrderingEnabled || !table) notFound();

  return (
    <PublicMenuView
      qrToken={token}
      tableName={table.name}
      logoUrl={settings.logoUrl}
      categories={categories}
      initialProducts={productFeed}
    />
  );
}
