import { ReceiptLine, ReceiptRule } from "@/components/shared/receipt-parts";
import { BoldGrandTotal } from "@/components/shared/receipt-style-parts";
import { formatCurrency } from "@/lib/currency";
import type { ReceiptStyle } from "@/lib/receipt-style";

/**
 * The printed totals lines of a sales invoice, in the invoice's style.
 * Presentational only — InvoicePrintTotals works out the amounts (with the
 * per-print "old account" choice), and the settings style previews render
 * it with sample amounts.
 */
export function InvoiceTotalsLines({
  style,
  lang,
  labels,
  itemsTotal,
  previousPayment,
  previousDebts,
  grandTotal,
}: {
  style: ReceiptStyle;
  lang: "ar" | "en" | "fr";
  labels: { total: string; previousPayment: string; previousDebts: string; grandTotal: string };
  itemsTotal: number;
  /** Shown when not null. */
  previousPayment: number | null;
  previousDebts: number | null;
  grandTotal: number;
}) {
  const money = (value: number) => formatCurrency(value, lang, false);
  const lines = (
    <>
      <ReceiptLine
        className="mt-[0.3em]"
        label={`${labels.total}:`}
        value={money(itemsTotal)}
      />
      {previousPayment !== null && (
        <ReceiptLine label={`${labels.previousPayment}:`} value={money(previousPayment)} />
      )}
      {previousDebts !== null && (
        <ReceiptLine label={`${labels.previousDebts}:`} value={money(previousDebts)} />
      )}
    </>
  );

  switch (style) {
    case "bold":
      return (
        <>
          {lines}
          <BoldGrandTotal label={labels.grandTotal} value={money(grandTotal)} />
        </>
      );
    case "icons":
      return (
        <>
          {lines}
          <ReceiptLine
            className="mt-[0.5em] border-y-[3px] border-double border-black py-[0.25em] text-[1.4em] leading-tight font-bold"
            label={labels.grandTotal}
            value={money(grandTotal)}
          />
        </>
      );
    default:
      return (
        <>
          {lines}
          <ReceiptRule />
          <ReceiptLine
            className="text-[1.5em] leading-tight font-bold"
            label={labels.grandTotal}
            value={money(grandTotal)}
          />
          <ReceiptRule />
        </>
      );
  }
}
