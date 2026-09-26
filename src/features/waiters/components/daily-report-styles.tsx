import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Coffee,
  CreditCard,
  FileText,
  UserRound,
} from "lucide-react";
import {
  BoldSection,
  HeartLine,
  IconsSection,
  LeaderLine,
  SolidRule,
} from "@/components/shared/receipt-style-parts";
import {
  ReceiptBrand,
  ReceiptLine,
  ReceiptRule,
  ReceiptThankYou,
} from "@/components/shared/receipt-parts";
import type { getWaiterDailyReport } from "@/features/waiters/queries";
import type { Lang } from "@/features/invoices/print-labels";
import type { dictionaries } from "@/i18n/dictionaries";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ReceiptStyle } from "@/lib/receipt-style";

/**
 * The daily waiter invoice's body, in each style picked in Settings →
 * Printing (previews in /public/invoices-styles/waiter/). Rendered inside
 * <ReceiptPaper>, so everything is sized in `em`.
 */

type Report = NonNullable<Awaited<ReturnType<typeof getWaiterDailyReport>>>;
type Invoice = Report["invoices"][number];

export type DailyReportProps = {
  report: Report;
  day: Date;
  /** When the invoice was generated (printed "Time"). */
  now: Date;
  lang: Lang;
  t: (typeof dictionaries)[Lang];
  /** Thermal roll: too narrow for side-by-side columns. */
  narrow: boolean;
  logoUrl: string | null;
  appName: string;
};

export function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function totals(report: Report) {
  const grand = report.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const paid = report.invoices.reduce(
    (sum, invoice) =>
      sum + (invoice.paymentStatus === "PAID" ? invoice.total : invoice.paidAmount),
    0,
  );
  const quantity = report.products.reduce((sum, product) => sum + product.quantity, 0);
  return { grand, paid, remaining: Math.max(0, grand - paid), quantity };
}

function qty(value: number) {
  return String(Number(value.toFixed(3)));
}

function InvoiceLink({ invoice, className }: { invoice: Invoice; className?: string }) {
  return (
    <Link href={`/dashboard/invoices/${invoice.id}`} dir="ltr" className={className}>
      {invoice.invoiceNumber}
    </Link>
  );
}

export function DailyReportBody({ style, ...props }: DailyReportProps & { style: ReceiptStyle }) {
  switch (style) {
    case "bold":
      return <BoldDailyReport {...props} />;
    case "icons":
      return <IconsDailyReport {...props} />;
    default:
      return <ClassicDailyReport {...props} />;
  }
}

// ---------- classic ----------

function ClassicDailyReport({ report, day, lang, t, narrow, logoUrl, appName }: DailyReportProps) {
  const labels = t.waiters.dailyReport;
  const sum = totals(report);
  const typeLabel = (type: Invoice["type"]) =>
    type === "DINE_IN"
      ? t.dashboard.cafeDineInLabel
      : type === "TAKEAWAY"
        ? t.dashboard.cafeTakeawayLabel
        : type;
  const orderType = (invoice: Invoice) =>
    `${typeLabel(invoice.type)}${invoice.tableName ? `-${invoice.tableName}` : ""}`;
  const stats = [
    { label: labels.ordersCount, value: String(report.invoices.length) },
    { label: labels.grandTotal, value: formatCurrency(sum.grand, lang) },
    { label: labels.paidTotal, value: formatCurrency(sum.paid, lang) },
    { label: labels.remainingTotal, value: formatCurrency(sum.remaining, lang) },
  ];

  return (
    <>
      <ReceiptBrand logoUrl={logoUrl} name={appName} />

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
                <InvoiceLink invoice={invoice} className="min-w-0 break-all" />
                <span className="shrink-0 font-bold whitespace-nowrap">
                  {formatCurrency(invoice.total, lang)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-[0.6em]">
                <span>
                  <span dir="ltr">{formatTime(invoice.createdAt)}</span> · {orderType(invoice)}
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
                  <InvoiceLink invoice={invoice} />
                </td>
                <td className="pe-[0.6em] pb-[0.5em]" dir="ltr">
                  {formatTime(invoice.createdAt)}
                </td>
                <td className="pe-[0.6em] pb-[0.5em]">{orderType(invoice)}</td>
                <td className="pe-[0.6em] pb-[0.5em] text-end whitespace-nowrap">
                  {formatCurrency(invoice.total, lang)}
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
                    {qty(product.quantity)}
                  </td>
                  <td className="pb-[0.3em] text-end whitespace-nowrap">
                    {formatCurrency(product.total, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <ReceiptRule />

      <div className={cn("grid gap-[0.5em]", narrow ? "grid-cols-2" : "grid-cols-4")}>
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
    </>
  );
}

// ---------- bold: black section headers, dotted leaders ----------

function BoldDailyReport({ report, day, now, lang, t, logoUrl, appName }: DailyReportProps) {
  const labels = t.waiters.dailyReport;
  const sum = totals(report);
  const money = (value: number) => formatCurrency(value, lang);

  return (
    <>
      <ReceiptBrand logoUrl={logoUrl} name={appName} />

      <h1 className="mt-[0.3em] text-center text-[1.8em] leading-tight font-extrabold uppercase">
        {labels.documentTitle}
      </h1>
      <div className="mx-auto mt-[0.2em] w-[30%] border-t-[1.5px] border-black" />

      <div className="mt-[0.7em] flex flex-wrap items-center justify-between gap-x-[1em] gap-y-[0.3em]">
        <p className="flex items-center gap-[0.4em] text-[1.1em]">
          <UserRound className="size-[1.2em] shrink-0 fill-black" />
          {labels.waiterLabel}: <span className="font-bold">{report.waiter.name}</span>
        </p>
        <div className="space-y-[0.1em]">
          <p className="flex items-center gap-[0.4em]">
            <CalendarDays className="size-[1.1em] shrink-0" />
            {labels.dateHeading}: <span dir="ltr" className="font-bold">{formatDate(day)}</span>
          </p>
          <p className="flex items-center gap-[0.4em]">
            <Clock className="size-[1.1em] shrink-0" />
            {labels.timeHeading}: <span dir="ltr" className="font-bold">{formatTime(now)}</span>
          </p>
        </div>
      </div>

      <ReceiptRule />

      <BoldSection>
        {labels.ordersSection} ({report.invoices.length})
      </BoldSection>
      {report.invoices.length === 0 ? (
        <p className="py-[0.6em] text-center">{labels.noOrders}</p>
      ) : (
        <div className="space-y-[0.2em]">
          {report.invoices.map((invoice, index) => (
            <LeaderLine
              key={invoice.id}
              name={
                <>
                  <span dir="ltr">{index + 1}.</span> <InvoiceLink invoice={invoice} />
                </>
              }
              values={
                <>
                  <span dir="ltr">{formatTime(invoice.createdAt)}</span>
                  <span>{money(invoice.total)}</span>
                </>
              }
            />
          ))}
        </div>
      )}
      <SolidRule />
      <ReceiptLine
        className="text-[1.1em] font-bold"
        label={`${labels.totalOrders}:`}
        value={<span className="text-[1.2em]">{money(sum.grand)}</span>}
      />

      {report.products.length > 0 && (
        <>
          <ReceiptRule />
          <BoldSection>
            {labels.productsSection} ({report.products.length})
          </BoldSection>
          <div className="space-y-[0.2em]">
            {report.products.map((product) => (
              <LeaderLine
                key={product.name}
                name={product.name}
                values={
                  <>
                    <span dir="ltr" className="tabular-nums">
                      {qty(product.quantity)} ×
                    </span>
                    <span>{money(product.total)}</span>
                  </>
                }
              />
            ))}
          </div>
          <SolidRule />
          <ReceiptLine
            className="text-[1.1em] font-bold"
            label={`${labels.totalProducts}:`}
            value={
              <span className="flex items-baseline gap-x-[1.5em] text-[1.2em]">
                <span dir="ltr">{qty(sum.quantity)}</span>
                {money(report.products.reduce((total, product) => total + product.total, 0))}
              </span>
            }
          />
        </>
      )}

      <ReceiptRule />
      <BoldSection>{labels.paymentSection}</BoldSection>
      <div className="space-y-[0.1em] text-[1.05em]">
        <ReceiptLine label={labels.totalAmount} value={money(sum.grand)} />
        <ReceiptLine label={labels.paidTotal} value={money(sum.paid)} />
        <ReceiptLine
          label={labels.remainingTotal}
          value={<span className="text-[1.25em] font-bold">{money(sum.remaining)}</span>}
        />
      </div>

      <ReceiptRule />
      <p className="mt-[0.4em] text-center font-serif text-[1.4em] font-bold italic">
        {labels.thankYou}
      </p>
      <HeartLine />
    </>
  );
}

// ---------- icons: section icons, dashed rules, typewriter text ----------

function IconsDailyReport({ report, day, now, lang, t, narrow, logoUrl, appName }: DailyReportProps) {
  const labels = t.waiters.dailyReport;
  const sum = totals(report);
  const money = (value: number) => formatCurrency(value, lang);
  // Name | middle value | amount, in three columns (wrapping on thermal rolls).
  const columns = narrow
    ? "grid grid-cols-[1fr_auto] gap-x-[0.8em]"
    : "grid grid-cols-[1fr_auto_minmax(7em,auto)] gap-x-[1.5em]";

  return (
    <div className="font-mono">
      <div className="font-sans">
        <ReceiptBrand logoUrl={logoUrl} name={appName} />
        <h1 className="mt-[0.3em] text-center text-[1.8em] leading-tight font-bold">
          {labels.documentTitle}
        </h1>
      </div>
      <p className="text-center text-[1.05em]">{labels.subtitle}</p>

      <div className="mt-[0.6em] flex flex-wrap items-end justify-between gap-x-[1em]">
        <p>
          {labels.waiterLabel}: <span className="font-bold">{report.waiter.name}</span>
        </p>
        <div className="ms-auto text-end">
          <p>
            {labels.dateHeading}: <span dir="ltr">{formatDate(day)}</span>
          </p>
          <p>
            {labels.timeHeading}: <span dir="ltr">{formatTime(now)}</span>
          </p>
        </div>
      </div>

      <ReceiptRule className="mt-[0.3em]" />

      <IconsSection icon={FileText}>
        {labels.ordersSection} ({report.invoices.length})
      </IconsSection>
      {report.invoices.length === 0 ? (
        <p className="py-[0.6em] text-center">{labels.noOrders}</p>
      ) : (
        <div className={cn(columns, "gap-y-[0.15em]")}>
          {report.invoices.map((invoice) => (
            <div key={invoice.id} className="contents">
              <InvoiceLink invoice={invoice} className="min-w-0 [overflow-wrap:anywhere]" />
              {narrow ? (
                <span className="text-end whitespace-nowrap">{money(invoice.total)}</span>
              ) : (
                <>
                  <span dir="ltr">{formatTime(invoice.createdAt)}</span>
                  <span className="text-end whitespace-nowrap">{money(invoice.total)}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <ReceiptRule />
      <ReceiptLine
        className="text-[1.1em] font-bold"
        label={`${labels.totalOrders}:`}
        value={<span className="font-sans text-[1.2em]">{money(sum.grand)}</span>}
      />

      {report.products.length > 0 && (
        <>
          <IconsSection icon={Coffee}>
            {labels.productsSection} ({report.products.length})
          </IconsSection>
          <div className={cn(columns, "gap-y-[0.15em]")}>
            {report.products.map((product) => (
              <div key={product.name} className="contents">
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {product.name}
                  {narrow && (
                    <>
                      {" "}
                      <span dir="ltr">×{qty(product.quantity)}</span>
                    </>
                  )}
                </span>
                {!narrow && (
                  <span dir="ltr" className="text-center tabular-nums">
                    {qty(product.quantity)}
                  </span>
                )}
                <span className="text-end whitespace-nowrap">{money(product.total)}</span>
              </div>
            ))}
          </div>
          <ReceiptRule />
          <div className={cn(columns, "text-[1.1em] font-bold")}>
            <span>{labels.totalProducts}:</span>
            {!narrow && (
              <span dir="ltr" className="text-center font-sans">
                {qty(sum.quantity)}
              </span>
            )}
            <span className="text-end font-sans text-[1.1em] whitespace-nowrap">
              {money(report.products.reduce((total, product) => total + product.total, 0))}
            </span>
          </div>
        </>
      )}

      <IconsSection icon={CreditCard}>{labels.paymentSection}</IconsSection>
      <div className="space-y-[0.1em]">
        <ReceiptLine label={`${labels.totalAmount}:`} value={money(sum.grand)} />
        <ReceiptLine label={`${labels.paidTotal}:`} value={money(sum.paid)} />
        <ReceiptLine
          label={`${labels.remainingTotal}:`}
          value={<span className="font-sans text-[1.25em] font-bold">{money(sum.remaining)}</span>}
        />
      </div>

      <ReceiptRule />
      <p className="mt-[0.5em] text-center text-[1.15em] tracking-wider uppercase">
        {labels.thankYou}
      </p>
      <HeartLine />
    </div>
  );
}
