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
import type { ReceiptPaperSize } from "@/lib/receipt-paper";

/**
 * Builds the JSON the Android "Bluetooth Print" app prints (Browser Print):
 * an object whose keys "0", "1", … are print entries, in order.
 *
 *   type 0 text  { content, bold 0|1, align 0|1|2, format 0-4 }
 *   type 1 image { path, align }
 *   type 4 html  { content } — rendered to an image by the app
 *
 * Latin receipts are sent as native text lines (crisp, fast). Anything
 * containing Arabic is sent as one HTML entry instead: thermal printer code
 * pages can't shape / right-to-left Arabic, while the app's HTML renderer
 * can, so the text stays exactly as stored (UTF-8, never transliterated).
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
type HtmlEntry = { type: 4; content: string };
export type BluetoothPrintEntry = TextEntry | ImageEntry | HtmlEntry;

/** Receipt layout, independent of how it ends up being printed. */
type Line =
  | { kind: "title"; text: string }
  | { kind: "center"; text: string; bold?: boolean; ltr?: boolean }
  | { kind: "text"; text: string }
  | { kind: "row"; left: string; right: string; bold?: boolean }
  | { kind: "item"; name: string; detail: string; total: string }
  | { kind: "total"; label: string; value: string }
  | { kind: "rule" };

const EXTRA_LABELS: Record<Lang, { cashier: string; payment: string; status: string }> = {
  ar: { cashier: "الكاشير", payment: "طريقة الدفع", status: "الحالة" },
  fr: { cashier: "Caissier", payment: "Paiement", status: "Statut" },
  en: { cashier: "Cashier", payment: "Payment", status: "Status" },
};

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Characters per line in the printer's default font (font A, 12×24). */
export function receiptLineWidth(paper: ReceiptPaperSize): number {
  return paper === "58mm" ? 32 : 48;
}

/** Amount without the bidi isolate marks formatCurrency adds for the web. */
function amount(value: number): string {
  return formatCurrency(value, "fr", true).replace(/[\u2066-\u2069]/g, "");
}

function quantity(value: number): string {
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

function buildLines(invoice: InvoiceData, settings: SystemSettingsData, lang: Lang): Line[] {
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

  const lines: Line[] = [
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

function toTextEntries(lines: Line[], width: number): TextEntry[] {
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
      case "rule":
        entries.push(text("-".repeat(width)));
        break;
    }
  }
  // Feed past the tear bar.
  entries.push(text(" "), text(" "));
  return entries;
}

// ---------- HTML rendering (Arabic / RTL) ----------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toHtmlEntry(lines: Line[], dir: "rtl" | "ltr"): HtmlEntry {
  // Numbers / codes are pinned left-to-right so an RTL receipt doesn't
  // reorder "1 x 3.00" or the date.
  const row = (left: string, right: string, style = "", ltrLeft = false) =>
    `<table style="width:100%;border-collapse:collapse;${style}"><tr>` +
    `<td>${ltrLeft ? `<span dir="ltr">${escapeHtml(left)}</span>` : escapeHtml(left)}</td>` +
    `<td dir="ltr" style="text-align:${dir === "rtl" ? "left" : "right"};white-space:nowrap">${escapeHtml(right)}</td>` +
    `</tr></table>`;

  const body = lines
    .map((line) => {
      switch (line.kind) {
        case "title":
          return `<div style="text-align:center;font-size:1.8em;font-weight:bold">${escapeHtml(line.text)}</div>`;
        case "center":
          return `<div style="text-align:center;${line.bold ? "font-weight:bold" : ""}"${line.ltr ? ' dir="ltr"' : ""}>${escapeHtml(line.text)}</div>`;
        case "text":
          return `<div>${escapeHtml(line.text)}</div>`;
        case "row":
          return row(line.left, line.right, line.bold ? "font-weight:bold" : "");
        case "item":
          return `<div>${escapeHtml(line.name)}</div>${row(line.detail, line.total, "font-size:0.9em", true)}`;
        case "total":
          return row(line.label, line.value, "font-weight:bold;font-size:1.4em");
        case "rule":
          return `<div style="border-top:1px dashed #000;margin:4px 0"></div>`;
      }
    })
    .join("");

  return {
    type: 4,
    content: `<div dir="${dir}" style="font-family:sans-serif;font-size:22px;color:#000;background:#fff">${body}<br/><br/></div>`,
  };
}

export function buildBluetoothReceipt({
  invoice,
  settings,
  origin,
}: {
  invoice: InvoiceData;
  settings: SystemSettingsData;
  /** Origin the app reached us on — used to make a bundled logo absolute. */
  origin: string;
}): Record<string, BluetoothPrintEntry> {
  const lang = resolveInvoiceLang(undefined, invoice.language);
  const lines = buildLines(invoice, settings, lang);

  const entries: BluetoothPrintEntry[] = [];
  const logo = printableLogoUrl(settings.logoUrl, origin);
  if (logo) entries.push({ type: 1, path: logo, align: 1 });

  const needsHtml =
    lang === "ar" ||
    lines.some((line) =>
      Object.values(line).some((value) => typeof value === "string" && ARABIC.test(value)),
    );
  if (needsHtml) entries.push(toHtmlEntry(lines, lang === "ar" ? "rtl" : "ltr"));
  else entries.push(...toTextEntries(lines, receiptLineWidth(settings.receiptPaperSize)));

  // The app expects a JSON object keyed "0", "1", … (PHP JSON_FORCE_OBJECT).
  return Object.fromEntries(entries.map((entry, index) => [String(index), entry]));
}
