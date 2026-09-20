import { notFound } from "next/navigation";
import { getTableById } from "@/features/tables/queries";
import { getSystemSettings } from "@/features/settings/queries";
import { requirePageAccess } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { getRequestOrigin } from "@/lib/request-origin";
import { TableQrCardView } from "@/features/tables/components/table-qr-card-view";

export const dynamic = "force-dynamic";

export default async function TableQrCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageAccess("ORDERS_VIEW");
  await requireFeature("QR_ORDERING");

  const { id } = await params;

  const [table, settings, origin] = await Promise.all([
    getTableById(id),
    getSystemSettings(),
    getRequestOrigin(),
  ]);
  if (!table || !table.qrEnabled || !table.qrToken) notFound();

  return (
    <TableQrCardView
      tableName={table.name}
      logoUrl={settings.logoUrl}
      appName={settings.appName}
      orderUrl={`${origin}/order/${table.qrToken}`}
    />
  );
}
