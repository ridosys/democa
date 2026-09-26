import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shared/back-button";
import { ReceiptPaper } from "@/components/shared/receipt-paper";
import { ReceiptPaperSwitcher } from "@/components/shared/receipt-paper-switcher";
import { ReceiptTextSizeSwitcher } from "@/components/shared/receipt-text-size-switcher";
import {
  ReceiptBrand,
  ReceiptRule,
  ReceiptThankYou,
} from "@/components/shared/receipt-parts";
import { InvoicePrintButton } from "@/features/invoices/components/invoice-print-button";
import { InvoicePdfButton } from "@/features/invoices/components/invoice-pdf-button";
import { getWaiterDailyReport } from "@/features/waiters/queries";
import { getSystemSettings } from "@/features/settings/queries";
import { formatCurrency } from "@/lib/currency";
import { formatDate, parseDateInputValue, toDateInputValue } from "@/lib/date";
import { requirePageAccess } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import {
  isThermalPaper,
  resolveReceiptPaper,
  resolveReceiptTextSize,
} from "@/lib/receipt-paper";
import { cn } from "@/lib/utils";
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
  searchParams: Promise<{ date?: string; paper?: string; text?: string }>;
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

  const paper = resolveReceiptPaper(requested.paper, settings.receiptPaperSize);
  const textSize = resolveReceiptTextSize(requested.text);
  // Thermal rolls can't fit five columns side by side — each order goes on
  // two lines and the stat boxes wrap 2×2.
  const narrow = isThermalPaper(paper);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const orderType = (invoice: (typeof report.invoices)[number]) =>
    `${typeLabel(invoice.type)}${invoice.tableName ? `-${invoice.tableName}` : ""}`;
  const stats = [
    { label: labels.ordersCount, value: String(report.invoices.length) },
    { label: labels.grandTotal, value: formatCurrency(grandTotal, locale) },
    { label: labels.paidTotal, value: formatCurrency(paidTotal, locale) },
    { label: labels.remainingTotal, value: formatCurrency(remainingTotal, locale) },
  ];

  return (
    <div className="space-y-5 p-0 sm:p-2 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <BackButton fallbackHref={`/dashboard/waiters/${id}`} />
        <div className="flex flex-wrap gap-2">
          <ReceiptPaperSwitcher paper={paper} />
          <ReceiptTextSizeSwitcher size={textSize} />
          <InvoicePdfButton
            targetId="waiter-daily-report"
            fileName={`${labels.fileName}-${report.waiter.name}-${date}.pdf`}
            label={t.common.openPdf}
            paper={paper}
          />
          <InvoicePrintButton label={t.common.printSavePdf} />
        </div>
      </div>

      <div className="overflow-x-auto pb-2 print:overflow-visible print:pb-0">
        <ReceiptPaper id="waiter-daily-report" paper={paper} textSize={textSize} dir={dir}>
          <ReceiptBrand logoUrl={settings.logoUrl} name={settings.appName} />

          <h1 className="mt-[0.3em] text-center text-[1.9em] leading-tight font-bold">
            {labels.documentTitle}
          </h1>

          <div className="mt-[0.5em] flex flex-wrap items-baseline justify-between gap-x-[1em] text-[1.1em]">
            <p>
              {labels.waiterLabel}: <span className="font-bold">{report.waiter.name}</span>
            </p>
            <p>
              {labels.dateHeading}: <span dir="ltr">{formatDate(day)}</span>
            </p>
          </div>

          <ReceiptRule />

          <h2 className="mb-[0.4em] text-[1.3em] font-bold">{labels.ordersSection}</h2>
          {report.invoices.length === 0 ? (
            <p className="py-[1em] text-center">{labels.noOrders}</p>
          ) : narrow ? (
            <div className="space-y-[0.5em]">
              {report.invoices.map((invoice) => (
                <div key={invoice.id}>
                  <div className="flex items-baseline justify-between gap-[0.6em]">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="min-w-0 break-all"
                      dir="ltr"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <span className="shrink-0 font-bold whitespace-nowrap">
                      {formatCurrency(invoice.total, locale)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-[0.6em]">
                    <span>
                      <span dir="ltr">{formatTime(invoice.createdAt)}</span> ·{" "}
                      {orderType(invoice)}
                    </span>
                    <span className="shrink-0 text-end">
                      {t.statusLabels.paymentStatus[invoice.paymentStatus]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full border-collapse text-[0.9em]">
              <thead>
                <tr className="font-bold">
                  <th className="pe-[0.6em] pb-[0.3em] text-start">{labels.invoiceColumn}</th>
                  <th className="pe-[0.6em] pb-[0.3em] text-start">{labels.timeColumn}</th>
                  <th className="pe-[0.6em] pb-[0.3em] text-start">{labels.typeColumn}</th>
                  <th className="pe-[0.6em] pb-[0.3em] text-end">{labels.totalColumn}</th>
                  <th className="pb-[0.3em] text-end">{labels.statusColumn}</th>
                </tr>
                <tr>
                  <td colSpan={5} className="p-0">
                    <ReceiptRule className="mt-0" />
                  </td>
                </tr>
              </thead>
              <tbody>
                {report.invoices.map((invoice) => (
                  <tr key={invoice.id} className="align-top">
                    <td className="pe-[0.6em] pb-[0.5em] break-all" dir="ltr">
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="pe-[0.6em] pb-[0.5em]" dir="ltr">
                      {formatTime(invoice.createdAt)}
                    </td>
                    <td className="pe-[0.6em] pb-[0.5em]">{orderType(invoice)}</td>
                    <td className="pe-[0.6em] pb-[0.5em] text-end whitespace-nowrap">
                      {formatCurrency(invoice.total, locale)}
                    </td>
                    <td className="pb-[0.5em] text-end">
                      {t.statusLabels.paymentStatus[invoice.paymentStatus]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {report.products.length > 0 && (
            <>
              <ReceiptRule />
              <h2 className="mb-[0.4em] text-[1.3em] font-bold">{labels.productsSection}</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="font-bold">
                    <th className="pe-[0.6em] pb-[0.3em] text-start">{labels.productColumn}</th>
                    <th className="w-[18%] pe-[0.6em] pb-[0.3em] text-center">
                      {labels.quantityColumn}
                    </th>
                    <th className="w-[32%] pb-[0.3em] text-end">{labels.totalColumn}</th>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-0">
                      <ReceiptRule className="mt-0" />
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {report.products.map((product) => (
                    <tr key={product.name} className="align-top">
                      <td className="pe-[0.6em] pb-[0.3em] break-words">{product.name}</td>
                      <td className="pe-[0.6em] pb-[0.3em] text-center tabular-nums">
                        {Number(product.quantity.toFixed(3))}
                      </td>
                      <td className="pb-[0.3em] text-end whitespace-nowrap">
                        {formatCurrency(product.total, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <ReceiptRule />

          <div
            className={cn(
              "grid gap-[0.5em]",
              narrow ? "grid-cols-2" : "grid-cols-4",
            )}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[0.6em] border-[1.5px] border-black px-[0.3em] py-[0.5em] text-center"
              >
                <p>{stat.label}</p>
                <p className="text-[1.25em] leading-tight font-bold whitespace-nowrap">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <ReceiptRule className="mt-[0.8em]" />

          <ReceiptThankYou>{labels.thankYou}</ReceiptThankYou>
        </ReceiptPaper>
      </div>
    </div>
  );
}
