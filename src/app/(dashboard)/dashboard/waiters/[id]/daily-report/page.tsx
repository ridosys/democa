import { notFound } from "next/navigation";
import { ReceiptPaper } from "@/components/shared/receipt-paper";
import { PrintToolbar } from "@/components/shared/print-toolbar";
import { DailyReportBody } from "@/features/waiters/components/daily-report-styles";
import { getWaiterDailyReport } from "@/features/waiters/queries";
import { getSystemSettings } from "@/features/settings/queries";
import { parseDateInputValue, toDateInputValue } from "@/lib/date";
import { requirePageAccess } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import {
  isThermalPaper,
  resolveReceiptPaper,
  resolveReceiptTextSize,
} from "@/lib/receipt-paper";
import { getLocale } from "@/i18n/server";
import { dictionaries } from "@/i18n/dictionaries";
import { resolveInvoiceLang } from "@/features/invoices/print-labels";

export const dynamic = "force-dynamic";

export default async function WaiterDailyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; paper?: string; text?: string; lang?: string }>;
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

  const [report, locale, settings] = await Promise.all([
    getWaiterDailyReport(id, day),
    getLocale(),
    getSystemSettings(),
  ]);
  if (!report) notFound();

  // The report is printed in its own language (`?lang=`), by default the
  // one set in Settings → Printing, else the staff member's UI language.
  const lang = resolveInvoiceLang(requested.lang, settings.receiptLanguage ?? locale);
  const t = dictionaries[lang];
  const labels = t.waiters.dailyReport;

  const paper = resolveReceiptPaper(requested.paper, settings.receiptPaperSize);
  const textSize = resolveReceiptTextSize(requested.text, settings.receiptTextSize);
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div className="space-y-5 p-0 sm:p-2 print:p-0">
      <PrintToolbar
        doc={{ kind: "waiter-report", id, date }}
        logoUrl={settings.logoUrl}
        printMethod={settings.printMethod}
        backHref={`/dashboard/waiters/${id}`}
        lang={lang}
        paper={paper}
        textSize={textSize}
        pdfTargetId="waiter-daily-report"
        pdfFileName={`${labels.fileName}-${report.waiter.name}-${date}.pdf`}
      />

      <div className="overflow-x-auto pb-2 print:overflow-visible print:pb-0">
        <ReceiptPaper id="waiter-daily-report" paper={paper} textSize={textSize} dir={dir}>
          <DailyReportBody
            style={settings.receiptStyle}
            report={report}
            day={day}
            now={new Date()}
            lang={lang}
            t={t}
            narrow={isThermalPaper(paper)}
            logoUrl={settings.logoUrl}
            appName={settings.appName}
          />
        </ReceiptPaper>
      </div>
    </div>
  );
}
