import { InvoiceBody, type InvoiceDoc } from "@/features/invoices/components/invoice-styles";
import { InvoiceTotalsLines } from "@/features/invoices/components/invoice-totals-lines";
import { INVOICE_PRINT_LABELS, type Lang } from "@/features/invoices/print-labels";
import { RECEIPT_MONO_FONT } from "@/lib/receipt-paper";
import { RECEIPT_STYLES, type ReceiptStyle } from "@/lib/receipt-style";

/**
 * Settings → Invoice styles picker: each style drawn on a sample sales
 * invoice by the same component the print page uses, so the preview is
 * exactly what gets printed (the purchase and waiter invoices follow the
 * same style).
 */

export type StylePreviews = Record<ReceiptStyle, React.ReactNode>;

const at = (hours: number, minutes: number) => new Date(2026, 0, 15, hours, minutes);

const SAMPLE_INVOICE: Omit<InvoiceDoc, "customer"> = {
  invoiceNumber: "INV-0115-00032",
  createdAt: at(19, 51),
  customerPhone: "0600000000",
  notes: null,
  items: [
    { id: "1", name: "Espresso", quantity: 3, unitPrice: 12, weight: 0 },
    { id: "2", name: "Croissant", quantity: 2, unitPrice: 5, weight: 0 },
    { id: "3", name: "Orange juice", quantity: 1, unitPrice: 18, weight: 0 },
  ],
};

export function buildStylePreviews({
  lang,
  logoUrl,
  appName,
}: {
  lang: Lang;
  logoUrl: string | null;
  appName: string;
}): StylePreviews {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = INVOICE_PRINT_LABELS[lang];
  const itemsTotal = SAMPLE_INVOICE.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const frame = (children: React.ReactNode) => (
    <div
      dir={dir}
      aria-hidden
      className="w-70 bg-white p-3 text-black shadow-sm ring-1 ring-black/10"
      style={{
        fontSize: "10px",
        lineHeight: 1.35,
        fontFamily: dir === "rtl" ? undefined : RECEIPT_MONO_FONT,
      }}
    >
      {children}
    </div>
  );

  const preview = (style: ReceiptStyle) =>
    frame(
      <InvoiceBody
        style={style}
        doc={{ ...SAMPLE_INVOICE, customer: t.walkInCustomer }}
        lang={lang}
        narrow
        logoUrl={logoUrl}
        appName={appName}
        totals={
          <InvoiceTotalsLines
            style={style}
            lang={lang}
            labels={t}
            itemsTotal={itemsTotal}
            previousPayment={null}
            previousDebts={null}
            grandTotal={itemsTotal}
          />
        }
      />,
    );

  return Object.fromEntries(RECEIPT_STYLES.map((style) => [style, preview(style)])) as StylePreviews;
}
