import "server-only";
import type { getInvoiceById } from "@/features/invoices/queries";
import type { SystemSettingsData } from "@/features/settings/queries";
import {
  INVOICE_PRINT_LABELS,
  resolveInvoiceLang,
  type Lang,
} from "@/features/invoices/print-labels";
import { dictionaries } from "@/i18n/dictionaries";
import { CURRENCY_LABEL, formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import {
  DEFAULT_RECEIPT_TEXT_SIZE,
  isReceiptPaperSize,
  receiptPrinterDots,
  resolveReceiptTextSize,
  type ReceiptPaperSize,
  type ReceiptTextSize,
} from "@/lib/receipt-paper";
import type { ReceiptPrintOptions } from "@/lib/print-method";

/**
 * Builds the JSON the Android "Bluetooth Print" app prints (Browser Print):
 * an object whose keys "0", "1", … are print entries, in order.
 *
 *   type 0 text  { content, bold 0|1, align 0|1|2, format 0-4 }
 *   type 1 image { path, align }
 *
 * Latin receipts are sent as native text lines (crisp, fast). Anything
 * containing Arabic is sent as one image instead, rendered on the server
 * (receipt-image.ts): thermal printer code pages can't shape right-to-left
 * Arabic, and the apps' HTML renderers lay it out badly, while a bitmap
 * prints the text exactly as stored (UTF-8, never transliterated).
 */

type InvoiceData = NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>;

type TextEntry = {
  type: 0;
  content: string;
  bold: 0 | 1;
  align: 0 | 1 | 2;
  format: 0 | 1 | 2 | 3 | 4;
};
type ImageEntry = { type: 1; path: string; align: 0 | 1 | 2 };
export type BluetoothPrintEntry = TextEntry | ImageEntry;

/** Receipt layout, independent of how it ends up being printed. */
export type ReceiptLine =
  | { kind: "title"; text: string }
  | { kind: "center"; text: string; bold?: boolean; ltr?: boolean }
  | { kind: "text"; text: string }
  /** `ltr`: the label is a code (invoice number…) kept left-to-right. */
  | { kind: "row"; left: string; right: string; bold?: boolean; ltr?: boolean }
  | { kind: "item"; name: string; detail: string; total: string }
  | { kind: "total"; label: string; value: string }
  /** Section heading — `inverse`: white on a black band. */
  | { kind: "section"; text: string; inverse?: boolean }
  | { kind: "rule" };

const EXTRA_LABELS: Record<Lang, { cashier: string; payment: string; status: string }> = {
  ar: { cashier: "الكاشير", payment: "طريقة الدفع", status: "الحالة" },
  fr: { cashier: "Caissier", payment: "Paiement", status: "Statut" },
  en: { cashier: "Cashier", payment: "Payment", status: "Status" },
};

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Whether receipt lines must be printed as an image rather than as plain
 * text: anything Arabic, or a text size other than the printer's fixed
 * font. */
export function receiptNeedsImage(
  lines: ReceiptLine[],
  lang: Lang,
  textSize: ReceiptTextSize,
): boolean {
  return (
    lang === "ar" ||
    textSize !== DEFAULT_RECEIPT_TEXT_SIZE ||
    lines.some((line) =>
      Object.values(line).some((value) => typeof value === "string" && ARABIC.test(value)),
    )
  );
}

/** Characters per line in the printer's default font (font A, 12×24). */
export function receiptLineWidth(paper: ReceiptPaperSize): number {
  return Math.floor(receiptPrinterDots(paper) / 12);
}

/** Amount without the bidi isolate marks formatCurrency adds for the web. */
export function amount(value: number, maxDecimals = 2): string {
  return formatCurrency(value, "fr", true, maxDecimals).replace(/[\u2066-\u2069]/g, "");
}

export function quantity(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/** Cloudinary logos are resized and flattened to a JPG the app can print;
 * relative (bundled) logos are made absolute against the request origin. */
function printableLogoUrl(logoUrl: string | null, origin: string): string | null {
  if (!logoUrl) return null;
  const absolute = /^https?:\/\//i.test(logoUrl)
    ? logoUrl
    : logoUrl.startsWith("/")
      ? `${origin}${logoUrl}`
      : null;
  if (!absolute) return null;
  return absolute.includes("res.cloudinary.com") && absolute.includes("/upload/")
    ? absolute.replace("/upload/", "/upload/c_limit,w_300,b_white,f_jpg/")
    : absolute;
}

/** A section heading in the "bold" (black band) or "icons" (heading over
 * a rule) receipt style. */
export function sectionLines(style: "bold" | "icons", text: string, lang: Lang): ReceiptLine[] {
  const heading = text.toLocaleUpperCase(lang);
  return style === "bold"
    ? [{ kind: "section", text: heading, inverse: true }]
    : [{ kind: "section", text: heading }, { kind: "rule" }];
}

function buildLines(invoice: InvoiceData, settings: SystemSettingsData, lang: Lang): ReceiptLine[] {
  if (settings.receiptStyle !== "classic") {
    return styledLines(invoice, settings, lang, settings.receiptStyle);
  }
  const t = INVOICE_PRINT_LABELS[lang];
  const extra = EXTRA_LABELS[lang];
  const statusLabels = dictionaries[lang].statusLabels;
  const currency = CURRENCY_LABEL[lang];

  const itemsTotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
    0,
  );
  const total = Number(invoice.total);
  const paid = Number(invoice.paidAmount);
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);

  const lines: ReceiptLine[] = [
    { kind: "center", text: settings.appName, bold: true },
    { kind: "title", text: t.title.toUpperCase() },
    { kind: "center", text: invoice.invoiceNumber, ltr: true },
    { kind: "center", text: formatDateTime(invoice.createdAt), ltr: true },
    { kind: "rule" },
    {
      kind: "text",
      text: `${t.billTo}: ${invoice.customerId ? invoice.customerName : t.walkInCustomer}`,
    },
  ];
  if (invoice.customerPhone.trim()) {
    lines.push({ kind: "text", text: `${t.phone}: ${invoice.customerPhone}` });
  }
  if (invoice.createdBy?.name) {
    lines.push({ kind: "text", text: `${extra.cashier}: ${invoice.createdBy.name}` });
  }
  lines.push({ kind: "rule" });

  for (const item of invoice.items) {
    const qty = Number(item.quantity);
    const unit = Number(item.unitPrice);
    lines.push({
      kind: "item",
      name: item.name,
      detail: `${quantity(qty)} x ${amount(unit)}`,
      total: amount(qty * unit),
    });
  }
  lines.push({ kind: "rule" });

  // Stored invoice total is the source of truth; the products subtotal is
  // only shown when something (e.g. a merged old balance) makes them differ.
  if (Math.abs(itemsTotal - total) >= 0.005) {
    lines.push({ kind: "row", left: t.total, right: amount(itemsTotal) });
  }
  lines.push({ kind: "total", label: t.invoiceTotal, value: `${amount(total)} ${currency}` });
  if (paid > 0 && remaining > 0) {
    lines.push({ kind: "row", left: t.totalPaid, right: amount(paid) });
    lines.push({ kind: "row", left: t.remaining, right: amount(remaining), bold: true });
  }
  lines.push({ kind: "rule" });
  lines.push({
    kind: "row",
    left: extra.payment,
    right: statusLabels.paymentMethod[invoice.paymentMethod],
  });
  lines.push({
    kind: "row",
    left: extra.status,
    right: statusLabels.paymentStatus[invoice.paymentStatus],
  });
  if (invoice.notes?.trim()) {
    lines.push({ kind: "rule" }, { kind: "text", text: invoice.notes.trim() });
  }
  lines.push({ kind: "rule" }, { kind: "center", text: t.thankYou, bold: true });
  return lines;
}

/** The "bold" and "icons" styles — the same sections as their print page. */
function styledLines(
  invoice: InvoiceData,
  settings: SystemSettingsData,
  lang: Lang,
  style: "bold" | "icons",
): ReceiptLine[] {
  const t = INVOICE_PRINT_LABELS[lang];
  const extra = EXTRA_LABELS[lang];
  const statusLabels = dictionaries[lang].statusLabels;
  const currency = CURRENCY_LABEL[lang];
  const itemsTotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
    0,
  );
  const total = Number(invoice.total);
  const paid = Number(invoice.paidAmount);
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  const weight = invoice.items.reduce(
    (sum, item) => sum + Number(item.product?.weight ?? 0) * Number(item.quantity),
    0,
  );

  const lines: ReceiptLine[] = [
    { kind: "center", text: settings.appName, bold: true },
    { kind: "title", text: style === "bold" ? t.title.toLocaleUpperCase(lang) : t.title },
    { kind: "center", text: invoice.invoiceNumber, ltr: true },
    { kind: "center", text: formatDateTime(invoice.createdAt), ltr: true },
    { kind: "rule" },
    {
      kind: "text",
      text: `${t.billTo}: ${invoice.customerId ? invoice.customerName : t.walkInCustomer}`,
    },
  ];
  if (invoice.customerPhone.trim()) {
    lines.push({ kind: "text", text: `${t.phone}: ${invoice.customerPhone}` });
  }
  if (invoice.createdBy?.name) {
    lines.push({ kind: "text", text: `${extra.cashier}: ${invoice.createdBy.name}` });
  }
  if (style === "bold") lines.push({ kind: "rule" });

  lines.push(...sectionLines(style, `${t.itemsSection} (${invoice.items.length})`, lang));
  for (const item of invoice.items) {
    const qty = Number(item.quantity);
    const unit = Number(item.unitPrice);
    lines.push({
      kind: "item",
      name: item.name,
      detail: `${quantity(qty)} x ${amount(unit)}`,
      total: amount(qty * unit),
    });
  }
  lines.push(
    { kind: "rule" },
    { kind: "row", left: `${t.itemsCount}:`, right: String(invoice.items.length) },
    { kind: "row", left: `${t.totalWeight}:`, right: weight.toFixed(2) },
  );
  if (style === "bold") lines.push({ kind: "rule" });

  lines.push(...sectionLines(style, t.paymentSection, lang));
  if (Math.abs(itemsTotal - total) >= 0.005) {
    lines.push({ kind: "row", left: `${t.total}:`, right: amount(itemsTotal) });
  }
  lines.push({ kind: "total", label: t.invoiceTotal, value: `${amount(total)} ${currency}` });
  if (paid > 0 && remaining > 0) {
    lines.push({ kind: "row", left: `${t.totalPaid}:`, right: amount(paid) });
    lines.push({ kind: "row", left: `${t.remaining}:`, right: amount(remaining), bold: true });
  }
  lines.push(
    { kind: "row", left: extra.payment, right: statusLabels.paymentMethod[invoice.paymentMethod] },
    { kind: "row", left: extra.status, right: statusLabels.paymentStatus[invoice.paymentStatus] },
  );
  if (invoice.notes?.trim()) {
    lines.push({ kind: "rule" }, { kind: "text", text: invoice.notes.trim() });
  }
  lines.push(
    { kind: "rule" },
    {
      kind: "center",
      text: style === "icons" ? t.thankYou.toLocaleUpperCase(lang) : t.thankYou,
      bold: true,
    },
  );
  return lines;
}

// ---------- plain text (ESC/POS) rendering ----------

/** Word-wraps to `width` columns, hard-splitting words longer than a line. */
export function wrapText(text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
    let rest = word;
    while (rest.length > width) {
      if (line) {
        out.push(line);
        line = "";
      }
      out.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    if (!line) line = rest;
    else if (line.length + 1 + rest.length <= width) line += ` ${rest}`;
    else {
      out.push(line);
      line = rest;
    }
  }
  if (line) out.push(line);
  return out.length > 0 ? out : [""];
}

/** "left ....... right" on one line, or left wrapped with right on the last
 * line when both don't fit. */
export function justify(left: string, right: string, width: number): string[] {
  if (left.length + 1 + right.length <= width) {
    return [left + " ".repeat(width - left.length - right.length) + right];
  }
  const wrapped = wrapText(left, width);
  const last = wrapped[wrapped.length - 1];
  if (last.length + 1 + right.length <= width) {
    wrapped[wrapped.length - 1] = last + " ".repeat(width - last.length - right.length) + right;
    return wrapped;
  }
  return [...wrapped, right.padStart(width)];
}

function text(content: string, opts: Partial<Omit<TextEntry, "type" | "content">> = {}): TextEntry {
  return { type: 0, content, bold: opts.bold ?? 0, align: opts.align ?? 0, format: opts.format ?? 0 };
}

function toTextEntries(lines: ReceiptLine[], width: number): TextEntry[] {
  const entries: TextEntry[] = [];
  for (const line of lines) {
    switch (line.kind) {
      case "title":
        entries.push(text(line.text, { bold: 1, align: 1, format: 2 }));
        break;
      case "center":
        for (const part of wrapText(line.text, width)) {
          entries.push(text(part, { bold: line.bold ? 1 : 0, align: 1 }));
        }
        break;
      case "text":
        for (const part of wrapText(line.text, width)) entries.push(text(part));
        break;
      case "row":
        for (const part of justify(line.left, line.right, width)) {
          entries.push(text(part, { bold: line.bold ? 1 : 0 }));
        }
        break;
      case "item":
        for (const part of wrapText(line.name, width)) entries.push(text(part));
        for (const part of justify(`  ${line.detail}`, line.total, width)) {
          entries.push(text(part));
        }
        break;
      case "total":
        // Double height keeps the full line width, so the justify still fits.
        for (const part of justify(line.label, line.value, width)) {
          entries.push(text(part, { bold: 1, format: 1 }));
        }
        break;
      case "section":
        // No white-on-black in text mode: a double-height bold heading.
        for (const part of wrapText(line.text, width)) {
          entries.push(text(part, { bold: 1, format: line.inverse ? 1 : 0 }));
        }
        break;
      case "rule":
        entries.push(text("-".repeat(width)));
        break;
    }
  }
  // Feed past the tear bar.
  entries.push(text(" "), text(" "));
  return entries;
}

/** Language / paper / text size chosen on the print page, falling back to
 * the invoice's own language, the default paper from settings and 100%. */
export function resolveReceiptOptions(
  invoice: InvoiceData,
  settings: SystemSettingsData,
  options: ReceiptPrintOptions = {},
): { lang: Lang; paper: ReceiptPaperSize; textSize: ReceiptTextSize } {
  const requested = typeof options.lang === "string" ? options.lang.toLowerCase() : undefined;
  return {
    lang: resolveInvoiceLang(
      requested === "ar" || requested === "fr" || requested === "en" ? requested : undefined,
      settings.receiptLanguage ?? invoice.language,
    ),
    paper: isReceiptPaperSize(options.paper) ? options.paper : settings.receiptPaperSize,
    textSize: resolveReceiptTextSize(options.textSize, settings.receiptTextSize),
  };
}

/** The invoice receipt's lines, and whether they must be printed as an
 * image (receiptNeedsImage). */
export function buildReceiptLines(
  invoice: InvoiceData,
  settings: SystemSettingsData,
  options: ReceiptPrintOptions = {},
) {
  const { lang, paper, textSize } = resolveReceiptOptions(invoice, settings, options);
  const lines = buildLines(invoice, settings, lang);
  const needsImage = receiptNeedsImage(lines, lang, textSize);
  return { lines, needsImage, paper, textSize, dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const) };
}

/** Thermer JSON for any receipt (see receipt-documents.ts). */
export function buildBluetoothReceipt({
  lines,
  needsImage,
  paper,
  logoUrl,
  origin,
  imageUrl,
}: {
  lines: ReceiptLine[];
  needsImage: boolean;
  paper: ReceiptPaperSize;
  logoUrl: string | null;
  /** Origin the app reached us on — used to make a bundled logo absolute. */
  origin: string;
  /** Signed URL of this receipt rendered as a PNG (for image receipts). */
  imageUrl: string;
}): Record<string, BluetoothPrintEntry> {
  const entries: BluetoothPrintEntry[] = [];
  const logo = printableLogoUrl(logoUrl, origin);
  if (logo) entries.push({ type: 1, path: logo, align: 1 });

  if (needsImage) entries.push({ type: 1, path: imageUrl, align: 1 });
  else entries.push(...toTextEntries(lines, receiptLineWidth(paper)));

  // The app expects a JSON object keyed "0", "1", … (PHP JSON_FORCE_OBJECT).
  return Object.fromEntries(entries.map((entry, index) => [String(index), entry]));
}
