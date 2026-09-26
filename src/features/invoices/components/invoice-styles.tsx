import { CalendarDays, CreditCard, Hash, Phone, ShoppingBag, UserRound } from "lucide-react";
import {
  ReceiptBrand,
  ReceiptLine,
  ReceiptRule,
  ReceiptThankYou,
} from "@/components/shared/receipt-parts";
import {
  BoldSection,
  BoldThankYou,
  BoldTitle,
  IconsSection,
  IconsThankYou,
  LeaderLine,
  SolidRule,
} from "@/components/shared/receipt-style-parts";
import { INVOICE_PRINT_LABELS, type Lang } from "@/features/invoices/print-labels";
import { CURRENCY_LABEL, formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ReceiptStyle } from "@/lib/receipt-style";

/**
 * The printed sales invoice's body, in each style picked in Settings →
 * Printing. Rendered inside <ReceiptPaper> (everything sized in `em`) by the
 * print page, and with sample data by the settings style previews.
 */

export type InvoiceDoc = {
  invoiceNumber: string;
  createdAt: Date;
  /** Customer name, or the "walk-in" label. */
  customer: string;
  customerPhone: string;
  notes: string | null;
  items: { id: string; name: string; quantity: number; unitPrice: number; weight: number }[];
};

export type InvoiceBodyProps = {
  doc: InvoiceDoc;
  lang: Lang;
  /** Thermal roll: too narrow for side-by-side columns. */
  narrow: boolean;
  logoUrl: string | null;
  appName: string;
  /** The totals block (InvoicePrintTotals, or sample lines in previews). */
  totals: React.ReactNode;
};

function summary(doc: InvoiceDoc) {
  return {
    count: doc.items.length,
    weight: doc.items.reduce((sum, item) => sum + item.weight * item.quantity, 0),
  };
}

export function InvoiceBody({ style, ...props }: InvoiceBodyProps & { style: ReceiptStyle }) {
  switch (style) {
    case "bold":
      return <BoldInvoice {...props} />;
    case "icons":
      return <IconsInvoice {...props} />;
    default:
      return <ClassicInvoice {...props} />;
  }
}

// ---------- classic ----------

function ClassicInvoice({ doc, lang, logoUrl, appName, totals }: InvoiceBodyProps) {
  const t = INVOICE_PRINT_LABELS[lang];
  const currency = CURRENCY_LABEL["fr"];
  const { count, weight } = summary(doc);

  return (
    <>
      <ReceiptBrand logoUrl={logoUrl} name={appName} />

      <h1 className="mt-[0.3em] text-center text-[2.2em] leading-tight font-bold uppercase">
        {t.title}
      </h1>
      <p className="text-center text-[1.1em] break-all" dir="ltr">
        {doc.invoiceNumber}
      </p>
      <p className="text-center text-[1.1em]" dir="ltr">
        {formatDateTime(doc.createdAt)}
      </p>

      <ReceiptRule />

      <p>
        {t.billTo}: {doc.customer}
      </p>
      <p>
        {t.phone}: <span dir="ltr">{doc.customerPhone}</span>
      </p>

      <ReceiptRule />

      <table className="w-full border-collapse">
        <thead>
          {/* Headers may break mid-word rather than push the columns
              past the paper edge at large text sizes. */}
          <tr className="align-top font-bold [&>th]:[overflow-wrap:anywhere]">
            <th className="w-[14%] pe-[0.4em] pb-[0.4em] text-start">{t.quantity}</th>
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
          {doc.items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="pe-[0.4em] pb-[0.3em]">{item.quantity}</td>
              <td className="pe-[0.4em] pb-[0.3em] [overflow-wrap:anywhere]">{item.name}</td>
              <td className="pe-[0.4em] pb-[0.3em] text-end whitespace-nowrap">
                {formatCurrency(item.unitPrice, lang, true)}
              </td>
              <td className="pb-[0.3em] text-end whitespace-nowrap">
                {formatCurrency(item.unitPrice * item.quantity, lang, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ReceiptRule />

      <p>
        {t.itemsCount}: {count}
      </p>
      <p>
        {t.totalWeight}: <span dir="ltr">{weight.toFixed(2)} kg</span>
      </p>

      {totals}

      {doc.notes && <p className="mt-[0.6em]">{doc.notes}</p>}

      <ReceiptThankYou>{t.thankYou}</ReceiptThankYou>
    </>
  );
}

// ---------- bold: black section bands, dotted leaders, boxed total ----------

function BoldInvoice({ doc, lang, logoUrl, appName, totals }: InvoiceBodyProps) {
  const t = INVOICE_PRINT_LABELS[lang];
  const { count, weight } = summary(doc);
  const money = (value: number) => formatCurrency(value, lang, true);

  return (
    <>
      <ReceiptBrand logoUrl={logoUrl} name={appName} />
      <BoldTitle>{t.title}</BoldTitle>

      <div className="mt-[0.7em] flex flex-wrap items-start justify-between gap-x-[1em] gap-y-[0.3em]">
        <div className="min-w-0 space-y-[0.1em]">
          <p className="flex items-center gap-[0.4em] text-[1.1em]">
            <UserRound className="size-[1.2em] shrink-0 fill-black" />
            <span className="font-bold [overflow-wrap:anywhere]">{doc.customer}</span>
          </p>
          {doc.customerPhone.trim() && (
            <p className="flex items-center gap-[0.4em]">
              <Phone className="size-[1.1em] shrink-0" />
              <span dir="ltr">{doc.customerPhone}</span>
            </p>
          )}
        </div>
        <div className="ms-auto space-y-[0.1em]">
          <p className="flex items-center gap-[0.4em]">
            <Hash className="size-[1.1em] shrink-0" />
            <span dir="ltr" className="font-bold [overflow-wrap:anywhere]">
              {doc.invoiceNumber}
            </span>
          </p>
          <p className="flex items-center gap-[0.4em]">
            <CalendarDays className="size-[1.1em] shrink-0" />
            <span dir="ltr">{formatDateTime(doc.createdAt)}</span>
          </p>
        </div>
      </div>

      <ReceiptRule />

      <BoldSection>
        {t.itemsSection} ({count})
      </BoldSection>
      <div className="space-y-[0.3em]">
        {doc.items.map((item) => (
          <div key={item.id}>
            <LeaderLine
              name={<span className="font-bold">{item.name}</span>}
              values={<span>{money(item.unitPrice * item.quantity)}</span>}
            />
            <p className="ps-[1em] text-[0.9em]">
              <span dir="ltr">{item.quantity}</span> × {money(item.unitPrice)}
            </p>
          </div>
        ))}
      </div>
      <SolidRule />
      <ReceiptLine label={`${t.itemsCount}:`} value={String(count)} />
      <ReceiptLine label={`${t.totalWeight}:`} value={<span dir="ltr">{weight.toFixed(2)} kg</span>} />

      <ReceiptRule />
      <BoldSection>{t.paymentSection}</BoldSection>
      {totals}

      {doc.notes && <p className="mt-[0.6em] italic">{doc.notes}</p>}

      <ReceiptRule />
      <BoldThankYou>{t.thankYou}</BoldThankYou>
    </>
  );
}

// ---------- icons: section icons, dashed rules, typewriter text ----------

function IconsInvoice({ doc, lang, narrow, logoUrl, appName, totals }: InvoiceBodyProps) {
  const t = INVOICE_PRINT_LABELS[lang];
  const { count, weight } = summary(doc);
  const money = (value: number) => formatCurrency(value, lang, true);
  // Product | qty × price | amount (qty goes under the name on thermal rolls).
  const columns = narrow
    ? "grid grid-cols-[1fr_auto] gap-x-[0.8em]"
    : "grid grid-cols-[1fr_auto_minmax(6em,auto)] gap-x-[1.5em]";

  return (
    <div className="font-mono">
      <div className="font-sans">
        <ReceiptBrand logoUrl={logoUrl} name={appName} />
        <h1 className="mt-[0.3em] text-center text-[1.9em] leading-tight font-bold">{t.title}</h1>
      </div>
      <p className="text-center text-[1.05em] [overflow-wrap:anywhere]" dir="ltr">
        {doc.invoiceNumber}
      </p>

      <div className="mt-[0.6em] flex flex-wrap items-end justify-between gap-x-[1em]">
        <div className="min-w-0">
          <p>
            {t.billTo}: <span className="font-bold">{doc.customer}</span>
          </p>
          {doc.customerPhone.trim() && (
            <p>
              {t.phone}: <span dir="ltr">{doc.customerPhone}</span>
            </p>
          )}
        </div>
        <p className="ms-auto text-end">
          {t.date}: <span dir="ltr">{formatDateTime(doc.createdAt)}</span>
        </p>
      </div>

      <IconsSection icon={ShoppingBag}>
        {t.itemsSection} ({count})
      </IconsSection>
      <div className={cn(columns, "gap-y-[0.2em]")}>
        {doc.items.map((item) => (
          <div key={item.id} className="contents">
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {item.name}
              {narrow && (
                <span className="block text-[0.9em]">
                  <span dir="ltr">{item.quantity}</span> × {money(item.unitPrice)}
                </span>
              )}
            </span>
            {!narrow && (
              <span className="text-end whitespace-nowrap">
                <span dir="ltr">{item.quantity}</span> × {money(item.unitPrice)}
              </span>
            )}
            <span className="text-end whitespace-nowrap">
              {money(item.unitPrice * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <ReceiptRule />
      <ReceiptLine label={`${t.itemsCount}:`} value={String(count)} />
      <ReceiptLine label={`${t.totalWeight}:`} value={<span dir="ltr">{weight.toFixed(2)} kg</span>} />

      <IconsSection icon={CreditCard}>{t.paymentSection}</IconsSection>
      {totals}

      {doc.notes && <p className="mt-[0.6em]">{doc.notes}</p>}

      <ReceiptRule />
      <IconsThankYou>{t.thankYou}</IconsThankYou>
    </div>
  );
}
