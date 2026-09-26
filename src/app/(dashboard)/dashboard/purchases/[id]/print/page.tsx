import { notFound } from "next/navigation";
import { getPurchaseOrderById } from "@/features/purchases/queries";
import { ReceiptPaper } from "@/components/shared/receipt-paper";
import { PrintToolbar } from "@/components/shared/print-toolbar";
import { getSystemSettings } from "@/features/settings/queries";
import { PurchaseBody } from "@/features/purchases/components/purchase-styles";
import { resolveInvoiceLang, type Lang } from "@/features/invoices/print-labels";
import { requirePageAccess } from "@/lib/permissions";
import {
  isThermalPaper,
  resolveReceiptPaper,
  resolveReceiptTextSize,
} from "@/lib/receipt-paper";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; paper?: string; text?: string }>;
}) {
  await requirePageAccess("PURCHASES_VIEW");

  const { id } = await params;
  const { lang: langParam, paper: paperParam, text } = await searchParams;

  const [order, settings] = await Promise.all([
    getPurchaseOrderById(id),
    getSystemSettings(),
  ]);
  if (!order) notFound();

  const lang: Lang = resolveInvoiceLang(langParam, settings.receiptLanguage ?? order.language);
  const dir = lang === "ar" ? "rtl" : "ltr";
  // Purchase invoices are A5 sheets unless another paper is picked here —
  // the saved default paper in settings is meant for sales receipts.
  const paper = resolveReceiptPaper(paperParam, "A5");
  const textSize = resolveReceiptTextSize(text, settings.receiptTextSize);
  const backHref = `/dashboard/purchases/${order.id}`;

  return (
    <div className="space-y-6 p-4 sm:p-6 print:p-0">
      <PrintToolbar
        doc={{ kind: "purchase", id: order.id }}
        logoUrl={settings.logoUrl}
        printMethod={settings.printMethod}
        backHref={backHref}
        lang={lang}
        paper={paper}
        textSize={textSize}
        pdfTargetId="purchase-order-card"
        pdfFileName={`${order.orderNumber}.pdf`}
      />

      <div className="overflow-x-auto pb-2 print:overflow-visible print:pb-0">
        <ReceiptPaper id="purchase-order-card" paper={paper} textSize={textSize} dir={dir}>
          <PurchaseBody
            style={settings.receiptStyle}
            doc={{
              orderNumber: order.orderNumber,
              createdAt: order.createdAt,
              supplierName: order.supplier.name,
              supplierPhone: order.supplier.phone,
              items: order.items.map((item) => ({
                id: item.id,
                name: item.product.name,
                quantity: Number(item.quantity),
                unitCost: Number(item.unitCost),
                weight: Number(item.product.weight ?? 0),
              })),
            }}
            lang={lang}
            narrow={isThermalPaper(paper)}
            logoUrl={settings.logoUrl}
            appName={settings.appName}
          />
        </ReceiptPaper>
      </div>
    </div>
  );
}
