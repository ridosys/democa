import { notFound } from "next/navigation";
import { getPurchaseOrderById } from "@/features/purchases/queries";
import { InvoicePrintButton } from "@/features/invoices/components/invoice-print-button";
import { InvoicePdfButton } from "@/features/invoices/components/invoice-pdf-button";
import { InvoiceLangSwitcher } from "@/features/invoices/components/invoice-lang-switcher";
import { BackButton } from "@/components/shared/back-button";
import { DocumentLogo } from "@/components/shared/document-logo";
import { ReceiptPaper } from "@/components/shared/receipt-paper";
import { ReceiptPaperSwitcher } from "@/components/shared/receipt-paper-switcher";
import { ReceiptTextSizeSwitcher } from "@/components/shared/receipt-text-size-switcher";
import { getSystemSettings } from "@/features/settings/queries";
import { requirePageAccess } from "@/lib/permissions";
import { getDictionary } from "@/i18n/server";
import { CURRENCY_LABEL, formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  isThermalPaper,
  resolveReceiptPaper,
  resolveReceiptTextSize,
} from "@/lib/receipt-paper";

export const dynamic = "force-dynamic";

type Lang = "ar" | "en" | "fr";

const LABELS: Record<
  Lang,
  {
    title: string;
    orderNumber: string;
    date: string;
    supplier: string;
    phone: string;
    product: string;
    quantity: string;
    unitCost: string;
    lineTotal: string;
    total: string;
    itemsCount: string;
    totalWeight: string;
    supplierSignature: string;
  }
> = {
  ar: {
    title: "فاتورة شراء",
    orderNumber: "رقم أمر الشراء",
    date: "التاريخ",
    supplier: "المورد",
    phone: "الهاتف",
    product: "نوع البضاعة",
    quantity: "العدد",
    unitCost: "التمن",
    lineTotal: "الإجمالي",
    total: "الإجمالي الكلي",
    itemsCount: "عدد المنتجات",
    totalWeight: "الوزن الإجمالي (kg)",
    supplierSignature: "توقيع المورد",
  },
  fr: {
    title: "Facture d'achat",
    orderNumber: "Numéro de commande",
    date: "Date",
    supplier: "Fournisseur",
    phone: "Téléphone",
    product: "Produit",
    quantity: "Quantité",
    unitCost: "Prix unitaire",
    lineTotal: "Sous-total",
    total: "Total",
    itemsCount: "Nombre de produits",
    totalWeight: "Poids total (kg)",
    supplierSignature: "Signature du fournisseur",
  },
  en: {
    title: "Purchase invoice",
    orderNumber: "Purchase order number",
    date: "Date",
    supplier: "Supplier",
    phone: "Phone",
    product: "Product",
    quantity: "Quantity",
    unitCost: "Unit cost",
    lineTotal: "Line total",
    total: "Grand total",
    itemsCount: "Number of products",
    totalWeight: "Total weight (kg)",
    supplierSignature: "Supplier signature",
  },
};

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

  const [order, uiT, settings] = await Promise.all([
    getPurchaseOrderById(id),
    getDictionary(),
    getSystemSettings(),
  ]);
  if (!order) notFound();

  const requestedLang = langParam ?? order.language.toLowerCase();
  const lang: Lang =
    requestedLang === "en" || requestedLang === "fr" ? requestedLang : "ar";
  const t = LABELS[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  // Purchase invoices are A5 sheets unless another paper is picked here —
  // the saved default paper in settings is meant for sales receipts.
  const paper = resolveReceiptPaper(paperParam, "A5");
  const textSize = resolveReceiptTextSize(text);
  // Thermal rolls: header stacked and centred, thinner cell borders.
  const narrow = isThermalPaper(paper);
  const backHref = `/dashboard/purchases/${order.id}`;
  const cell = cn(
    "px-[0.4em] py-[0.3em] text-start align-top border-gray-400",
    // Mid-word breaks only where the roll is too narrow for whole words.
    narrow ? "border [overflow-wrap:anywhere]" : "border-2 break-words",
  );

  const grandTotal = order.items.reduce(
    (sum, item) => sum + Number(item.unitCost) * Number(item.quantity),
    0,
  );
  const itemsCount = order.items.length;
  const totalWeight = order.items.reduce(
    (sum, item) => sum + Number(item.product.weight ?? 0) * Number(item.quantity),
    0,
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 print:p-0">
      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <BackButton fallbackHref={backHref} />
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <InvoiceLangSwitcher lang={lang} />
          <ReceiptPaperSwitcher paper={paper} />
          <ReceiptTextSizeSwitcher size={textSize} />
          <InvoicePdfButton
            targetId="purchase-order-card"
            fileName={`${order.orderNumber}.pdf`}
            label={uiT.common.openPdf}
            paper={paper}
          />
          <InvoicePrintButton label={uiT.common.printSavePdf} backHref={backHref} />
        </div>
      </div>

      <div className="overflow-x-auto pb-2 print:overflow-visible print:pb-0">
        <ReceiptPaper id="purchase-order-card" paper={paper} textSize={textSize} dir={dir}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th colSpan={4} className="border-none p-0 pb-[1.2em] text-start font-normal">
                  <div
                    className={cn(
                      "flex gap-[0.8em]",
                      narrow ? "flex-col items-center text-center" : "items-start justify-between",
                    )}
                  >
                    <DocumentLogo
                      logoUrl={settings.logoUrl}
                      name={settings.appName}
                      imgClassName="h-[3.5em] w-auto max-w-[14em] object-contain"
                      nameClassName="text-[1.6em] font-bold"
                    />
                    <div className={narrow ? "text-center" : "text-end"}>
                      <h2 className="text-[1.45em] leading-tight font-bold">{t.title}</h2>
                      <p className="font-semibold">
                        {t.orderNumber}:{" "}
                        <span dir="ltr" className="[overflow-wrap:anywhere]">
                          {order.orderNumber}
                        </span>
                      </p>
                      <p className="font-semibold">
                        {t.date}: {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-[1em]">
                    <p className="font-semibold">
                      {t.supplier}:
                      <span className="mx-[0.4em] font-bold">{order.supplier.name}</span>
                    </p>
                    {order.supplier.phone && (
                      <p className="font-semibold">
                        {t.phone}: <span dir="ltr">{order.supplier.phone}</span>
                      </p>
                    )}
                  </div>
                </th>
              </tr>
              <tr className="font-bold">
                <th className={cell}>{t.quantity}</th>
                <th className={cell}>{t.product}</th>
                <th className={cell}>
                  {t.unitCost} ({CURRENCY_LABEL["fr"]})
                </th>
                <th className={cell}>
                  {t.lineTotal} ({CURRENCY_LABEL["fr"]})
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="font-semibold">
                  <td className={cell}>{Number(item.quantity)}</td>
                  <td className={cell}>{item.product.name}</td>
                  <td className={cn(cell, "whitespace-nowrap")}>
                    {formatCurrency(Number(item.unitCost), lang, true, 4)}
                  </td>
                  <td className={cn(cell, "whitespace-nowrap")}>
                    {formatCurrency(
                      Number(item.unitCost) * Number(item.quantity),
                      lang,
                      true,
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="border-none p-0 pt-[1em]">
                  <div className="flex flex-wrap items-center justify-between gap-x-[1.5em] gap-y-[0.2em] border-t-2 border-gray-400 pt-[0.6em] font-semibold">
                    <p>
                      {t.itemsCount}: <span className="font-bold">{itemsCount}</span>
                    </p>
                    <p>
                      {t.totalWeight}:{" "}
                      <span className="font-bold" dir="ltr">
                        {totalWeight.toFixed(2)} kg
                      </span>
                    </p>
                  </div>

                  <div className="mt-[0.6em] flex flex-wrap items-center justify-between gap-x-[1em] rounded-md border-2 border-gray-400 bg-gray-100 px-[0.8em] py-[0.4em] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                    <p className="text-[1.1em] font-bold">{t.total}</p>
                    <p className="ms-auto text-[1.25em] font-bold whitespace-nowrap">
                      {formatCurrency(grandTotal, lang, false)}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "flex pt-[1.8em] break-inside-avoid",
                      narrow ? "justify-center" : "justify-start",
                    )}
                  >
                    <div className="flex flex-col items-center gap-[0.5em]">
                      <div className="size-[9em] rounded-md border border-gray-300" />
                      <p className="font-semibold">{t.supplierSignature}</p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </ReceiptPaper>
      </div>
    </div>
  );
}
