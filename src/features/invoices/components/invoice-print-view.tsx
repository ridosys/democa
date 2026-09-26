import { InvoicePrintTotals } from "@/features/invoices/components/invoice-print-totals";
import { AutoPrint } from "@/features/invoices/components/auto-print";
import { ReceiptPaper } from "@/components/shared/receipt-paper";
import { PrintToolbar } from "@/components/shared/print-toolbar";
import { InvoiceBody } from "@/features/invoices/components/invoice-styles";
import type { getInvoiceById } from "@/features/invoices/queries";
import type { getSystemSettings } from "@/features/settings/queries";
import {
  isThermalPaper,
  type ReceiptPaperSize,
  type ReceiptTextSize,
} from "@/lib/receipt-paper";
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
  const t = INVOICE_PRINT_LABELS[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const itemsTotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
    0,
  );

  const isPartiallyPaid = invoice.paymentStatus === "PARTIALLY_PAID";
  const previousPayment = isPartiallyPaid ? Number(invoice.paidAmount) : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 print:p-0">
      {autoPrint && <AutoPrint />}
      <PrintToolbar
        doc={{ kind: "invoice", id: invoice.id }}
        logoUrl={settings.logoUrl}
        printMethod={settings.printMethod}
        backHref={backHref}
        homeHref={homeHref}
        homeLabel={homeLabel}
        lang={lang}
        paper={paper}
        textSize={textSize}
        pdfTargetId="invoice-card"
        pdfFileName={`${invoice.invoiceNumber}.pdf`}
        pdfAutoOpen={auto === "pdf"}
      />

      {/* InvoicePrintTotals portals its on-screen "old account" controls
          here, so they stay outside the printed / PDF receipt. */}
      <div
        id={PRINT_CONTROLS_SLOT_ID}
        className="mx-auto max-w-md empty:hidden print:hidden"
      />

      <div className="overflow-x-auto pb-2 print:overflow-visible print:pb-0">
        <ReceiptPaper id="invoice-card" paper={paper} textSize={textSize} dir={dir}>
          <InvoiceBody
            style={settings.receiptStyle}
            doc={{
              invoiceNumber: invoice.invoiceNumber,
              createdAt: invoice.createdAt,
              customer: invoice.customerId ? invoice.customerName : t.walkInCustomer,
              customerPhone: invoice.customerPhone,
              notes: invoice.notes,
              items: invoice.items.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                weight: Number(item.product?.weight ?? 0),
              })),
            }}
            lang={lang}
            narrow={isThermalPaper(paper)}
            logoUrl={settings.logoUrl}
            appName={settings.appName}
            totals={
              <InvoicePrintTotals
                style={settings.receiptStyle}
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
            }
          />
        </ReceiptPaper>
      </div>
    </div>
  );
}
