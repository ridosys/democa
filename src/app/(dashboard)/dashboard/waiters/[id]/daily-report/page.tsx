import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/shared/back-button";
import { DocumentLogo } from "@/components/shared/document-logo";
import { InvoicePrintButton } from "@/features/invoices/components/invoice-print-button";
import { InvoicePdfButton } from "@/features/invoices/components/invoice-pdf-button";
import { getWaiterDailyReport } from "@/features/waiters/queries";
import { getSystemSettings } from "@/features/settings/queries";
import { formatCurrency } from "@/lib/currency";
import { formatDate, parseDateInputValue, toDateInputValue } from "@/lib/date";
import { requirePageAccess } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { getDictionary, getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default async function WaiterDailyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  await requirePageAccess("ORDERS_VIEW");
  await requireFeature("WAITERS");

  const { id } = await params;
  const requested = await searchParams;
  const date =
    requested.date && /^\d{4}-\d{2}-\d{2}$/.test(requested.date)
      ? requested.date
      : toDateInputValue(new Date());
  const day = parseDateInputValue(date);

  const [report, t, locale, settings] = await Promise.all([
    getWaiterDailyReport(id, day),
    getDictionary(),
    getLocale(),
    getSystemSettings(),
  ]);
  if (!report) notFound();

  const labels = t.waiters.dailyReport;
  const typeLabel = (type: "RETAIL" | "DINE_IN" | "TAKEAWAY") =>
    type === "DINE_IN"
      ? t.dashboard.cafeDineInLabel
      : type === "TAKEAWAY"
        ? t.dashboard.cafeTakeawayLabel
        : type;

  const grandTotal = report.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const paidTotal = report.invoices.reduce(
    (sum, invoice) =>
      sum + (invoice.paymentStatus === "PAID" ? invoice.total : invoice.paidAmount),
    0,
  );
  const remainingTotal = Math.max(0, grandTotal - paidTotal);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 print:max-w-none print:p-0">
      <style>{`
        @page { size: A5 portrait; margin: 8mm; }
        @media print {
          html, body { background: white !important; }
          #waiter-daily-report { width: 100%; min-height: 0; }
          #waiter-daily-report table { font-size: 10px; }
          #waiter-daily-report a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
      <div className="flex items-center justify-between gap-2 print:hidden">
        <BackButton fallbackHref={`/dashboard/waiters/${id}`} />
        <div className="flex gap-2">
          <InvoicePdfButton
            targetId="waiter-daily-report"
            fileName={`${labels.fileName}-${report.waiter.name}-${date}.pdf`}
            label={t.common.openPdf}
          />
          <InvoicePrintButton label={t.common.printSavePdf} />
        </div>
      </div>

      <section
        id="waiter-daily-report"
        className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]"
      >
        <header className="flex flex-col justify-between gap-5 border-b pb-5 sm:flex-row">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ReceiptText className="size-6 text-primary print:hidden" />
              <h1 className="text-2xl font-bold">{labels.documentTitle}</h1>
            </div>
            <DocumentLogo
              logoUrl={settings.logoUrl}
              name={settings.appName}
              nameClassName="font-semibold"
              imgClassName="h-10 w-auto max-w-[180px] object-contain"
            />
          </div>
          <div className="space-y-1 text-sm sm:text-end">
            <p>
              <span className="text-muted-foreground">{labels.waiterLabel}: </span>
              <strong>{report.waiter.name}</strong>
            </p>
            {report.waiter.phone && (
              <p dir="ltr" className="sm:ms-auto">
                {report.waiter.phone}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">{labels.dateHeading}: </span>
              <span dir="ltr">{formatDate(day)}</span>
            </p>
          </div>
        </header>

        <h2 className="mt-6 mb-2 font-semibold print:mt-4">{labels.ordersSection}</h2>
        <div className="overflow-hidden rounded-xl border print:rounded-none">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 text-start print:py-2">{labels.invoiceColumn}</th>
                <th className="px-4 py-3 text-start print:py-2">{labels.timeColumn}</th>
                <th className="px-4 py-3 text-start print:py-2">{labels.typeColumn}</th>
                <th className="px-4 py-3 text-start print:py-2">{labels.totalColumn}</th>
                <th className="px-4 py-3 text-end print:py-2">{labels.statusColumn}</th>
              </tr>
            </thead>
            <tbody>
              {report.invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {labels.noOrders}
                  </td>
                </tr>
              ) : (
                report.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t">
                    <td className="px-4 py-3 font-medium print:py-2" dir="ltr">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="hover:text-primary hover:underline print:text-foreground print:no-underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 print:py-2" dir="ltr">
                      {formatTime(invoice.createdAt)}
                    </td>
                    <td className="px-4 py-3 print:py-2">
                      {typeLabel(invoice.type)}
                      {invoice.tableName ? ` · ${invoice.tableName}` : ""}
                    </td>
                    <td className="px-4 py-3 font-medium print:py-2">
                      {formatCurrency(invoice.total, locale)}
                    </td>
                    <td className="px-4 py-3 text-end print:py-2">
                      <Badge
                        variant={
                          invoice.paymentStatus === "PAID"
                            ? "default"
                            : invoice.paymentStatus === "PARTIALLY_PAID"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {t.statusLabels.paymentStatus[invoice.paymentStatus]}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {report.products.length > 0 && (
          <>
            <h2 className="mt-6 mb-2 font-semibold print:mt-4">{labels.productsSection}</h2>
            <div className="overflow-hidden rounded-xl border print:rounded-none">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-start print:py-2">{labels.productColumn}</th>
                    <th className="px-4 py-3 text-start print:py-2">{labels.quantityColumn}</th>
                    <th className="px-4 py-3 text-end print:py-2">{labels.totalColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.products.map((product) => (
                    <tr key={product.name} className="border-t">
                      <td className="px-4 py-3 print:py-2">{product.name}</td>
                      <td className="px-4 py-3 tabular-nums print:py-2">
                        {Number(product.quantity.toFixed(3))}
                      </td>
                      <td className="px-4 py-3 text-end font-medium print:py-2">
                        {formatCurrency(product.total, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 print:mt-4 print:grid-cols-4 print:gap-2">
          <div className="rounded-xl border p-4 text-center print:rounded-lg print:p-2.5">
            <p className="text-sm text-muted-foreground">{labels.ordersCount}</p>
            <p className="mt-1 text-lg font-bold">{report.invoices.length}</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center print:rounded-lg print:p-2.5">
            <p className="text-sm text-muted-foreground">{labels.grandTotal}</p>
            <p className="mt-1 text-lg font-bold">{formatCurrency(grandTotal, locale)}</p>
          </div>
          <div className="rounded-xl border p-4 text-center print:rounded-lg print:p-2.5">
            <p className="text-sm text-muted-foreground">{labels.paidTotal}</p>
            <p className="mt-1 text-lg font-bold">{formatCurrency(paidTotal, locale)}</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center print:rounded-lg print:p-2.5">
            <p className="text-sm text-muted-foreground">{labels.remainingTotal}</p>
            <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(remainingTotal, locale)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
