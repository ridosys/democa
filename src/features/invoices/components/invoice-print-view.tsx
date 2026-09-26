import Link from "next/link";
import { Calculator } from "lucide-react";
import { InvoicePrintButton } from "@/features/invoices/components/invoice-print-button";
import { InvoicePdfButton } from "@/features/invoices/components/invoice-pdf-button";
import { BluetoothPrintButton } from "@/features/invoices/components/bluetooth-print-button";
import { InvoicePrintTotals } from "@/features/invoices/components/invoice-print-totals";
import { AutoPrint } from "@/features/invoices/components/auto-print";
import { InvoiceLangSwitcher } from "@/features/invoices/components/invoice-lang-switcher";
import { BackButton } from "@/components/shared/back-button";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { ReceiptPaper } from "@/components/shared/receipt-paper";
import { ReceiptPaperSwitcher } from "@/components/shared/receipt-paper-switcher";
import { ReceiptTextSizeSwitcher } from "@/components/shared/receipt-text-size-switcher";
import {
  ReceiptBrand,
  ReceiptRule,
  ReceiptThankYou,
} from "@/components/shared/receipt-parts";
import type { getInvoiceById } from "@/features/invoices/queries";
import type { getSystemSettings } from "@/features/settings/queries";
import { getDictionary } from "@/i18n/server";
import { CURRENCY_LABEL, formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import type { ReceiptPaperSize, ReceiptTextSize } from "@/lib/receipt-paper";
import {
  INVOICE_PRINT_LABELS,
  resolveInvoiceLang,
  type Lang,
} from "@/features/invoices/print-labels";

const PRINT_CONTROLS_SLOT_ID = "invoice-print-controls";

export { resolveInvoiceLang, type Lang };

type InvoiceData = NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>;
type Settings = Awaited<ReturnType<typeof getSystemSettings>>;

type OutstandingInvoice = {
  id: string;
  invoiceNumber: string;
  total: number;
  paidAmount: number;
  paymentStatus: InvoiceData["paymentStatus"];
  createdAt: Date;
  items: { id: string; name: string; quantity: number; unitPrice: number }[];
};

export async function InvoicePrintView({
  invoice,
  settings,
  lang,
  auto,
  backHref,
  homeHref,
  homeLabel,
  otherOutstandingInvoices,
  paper,
  textSize,
  autoPrint = false,
}: {
  invoice: InvoiceData;
  settings: Settings;
  lang: Lang;
  auto?: string;
  backHref: string;
  /** An explicit "go home" destination alongside the browser-history Back
   * button — e.g. the Caisse a cashier printed this invoice from. Omitted
   * on the dashboard print route, where backHref already points at the
   * invoice's own page. */
  homeHref?: string;
  homeLabel?: string;
  otherOutstandingInvoices: OutstandingInvoice[];
  paper: ReceiptPaperSize;
  textSize: ReceiptTextSize;
  /** Open the print dialog as soon as the receipt is ready (`?autoprint=1`). */
  autoPrint?: boolean;
}) {
  const uiT = await getDictionary();
  const t = INVOICE_PRINT_LABELS[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const itemsTotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
    0,
  );
  const itemsCount = invoice.items.length;
  const totalWeight = invoice.items.reduce(
    (sum, item) =>
      sum + Number(item.product?.weight ?? 0) * Number(item.quantity),
    0,
  );

  const isPartiallyPaid = invoice.paymentStatus === "PARTIALLY_PAID";
  const previousPayment = isPartiallyPaid ? Number(invoice.paidAmount) : 0;

  const currency = CURRENCY_LABEL["fr"];

  return (
    <div className="space-y-6 p-4 sm:p-6 print:p-0">
      {autoPrint && <AutoPrint />}
      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <BrandMark size="sm" logoUrl={settings.logoUrl} />
          <BackButton fallbackHref={backHref} />
          {homeHref && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              nativeButton={false}
              render={<Link href={homeHref} />}
            >
              <Calculator className="size-4" />
              {homeLabel}
            </Button>
          )}
        </div>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <InvoiceLangSwitcher lang={lang} />
          <ReceiptPaperSwitcher paper={paper} />
          <ReceiptTextSizeSwitcher size={textSize} />
          <InvoicePdfButton
            targetId="invoice-card"
            fileName={`${invoice.invoiceNumber}.pdf`}
            label={uiT.common.openPdf}
            autoOpen={auto === "pdf"}
            paper={paper}
          />
          <InvoicePrintButton
            label={uiT.common.printSavePdf}
            variant={settings.printMethod === "browser" ? "default" : "outline"}
            backHref={backHref}
          />
          <BluetoothPrintButton
            invoiceId={invoice.id}
            method={settings.printMethod}
            variant="default"
            options={{ lang, paper, textSize: String(textSize) }}
            backHref={backHref}
          />
        </div>
      </div>

      {/* InvoicePrintTotals portals its on-screen "old account" controls
          here, so they stay outside the printed / PDF receipt. */}
      <div
        id={PRINT_CONTROLS_SLOT_ID}
        className="mx-auto max-w-md empty:hidden print:hidden"
      />

      <div className="overflow-x-auto pb-2 print:overflow-visible print:pb-0">
        <ReceiptPaper id="invoice-card" paper={paper} textSize={textSize} dir={dir}>
          <ReceiptBrand logoUrl={settings.logoUrl} name={settings.appName} />

          <h1 className="mt-[0.3em] text-center text-[2.2em] leading-tight font-bold uppercase">
            {t.title}
          </h1>
          <p className="text-center text-[1.1em] break-all" dir="ltr">
            {invoice.invoiceNumber}
          </p>
          <p className="text-center text-[1.1em]" dir="ltr">
            {formatDateTime(invoice.createdAt)}
          </p>

          <ReceiptRule />

          <p>
            {t.billTo}:{" "}
            {invoice.customerId ? invoice.customerName : t.walkInCustomer}
          </p>
          <p>
            {t.phone}: <span dir="ltr">{invoice.customerPhone}</span>
          </p>

          <ReceiptRule />

          <table className="w-full border-collapse">
            <thead>
              {/* Headers may break mid-word rather than push the columns
                  past the paper edge at large text sizes. */}
              <tr className="align-top font-bold [&>th]:[overflow-wrap:anywhere]">
                <th className="w-[14%] pe-[0.4em] pb-[0.4em] text-start">
                  {t.quantity}
                </th>
                <th className="pe-[0.4em] pb-[0.4em] text-start">{t.product}</th>
                <th className="w-[22%] pe-[0.4em] pb-[0.4em] text-end">
                  {t.unitPrice}
                  <br />({currency})
                </th>
                <th className="w-[24%] pb-[0.4em] text-end">
                  {t.lineTotal}
                  <br />({currency})
                </th>
              </tr>
              <tr>
                <td colSpan={4} className="p-0">
                  <ReceiptRule className="mt-0" />
                </td>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="pe-[0.4em] pb-[0.3em]">
                    {Number(item.quantity)}
                  </td>
                  <td className="pe-[0.4em] pb-[0.3em] [overflow-wrap:anywhere]">
                    {item.name}
                  </td>
                  <td className="pe-[0.4em] pb-[0.3em] text-end whitespace-nowrap">
                    {formatCurrency(Number(item.unitPrice), lang, true)}
                  </td>
                  <td className="pb-[0.3em] text-end whitespace-nowrap">
                    {formatCurrency(
                      Number(item.unitPrice) * Number(item.quantity),
                      lang,
                      true,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ReceiptRule />

          <p>
            {t.itemsCount}: {itemsCount}
          </p>
          <p>
            {t.totalWeight}: <span dir="ltr">{totalWeight.toFixed(2)} kg</span>
          </p>

          <InvoicePrintTotals
            lang={lang}
            controlsSlotId={PRINT_CONTROLS_SLOT_ID}
            labels={{
              total: t.total,
              previousPayment: t.previousPayment,
              previousDebts: t.previousDebts,
              oldAccountPrompt: t.oldAccountPrompt,
              includeOldAccount: t.includeOldAccount,
              excludeOldAccount: t.excludeOldAccount,
              selectInvoicesTitle: t.selectInvoicesTitle,
              selectAllInvoices: t.selectAllInvoices,
              invoiceTotal: t.invoiceTotal,
              totalPaid: t.totalPaid,
              remaining: t.remaining,
              done: t.done,
              grandTotal: t.grandTotal,
            }}
            itemsTotal={itemsTotal}
            previousPayment={previousPayment}
            showPreviousPayment={isPartiallyPaid}
            otherOutstandingInvoices={otherOutstandingInvoices}
          />

          {invoice.notes && <p className="mt-[0.6em]">{invoice.notes}</p>}

          <ReceiptThankYou>{t.thankYou}</ReceiptThankYou>
        </ReceiptPaper>
      </div>
    </div>
  );
}
