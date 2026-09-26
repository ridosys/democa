import "server-only";
import {
  amount,
  buildReceiptLines,
  sectionLines,
  quantity,
  receiptNeedsImage,
  resolveReceiptOptions,
  type ReceiptLine,
} from "@/features/invoices/bluetooth-receipt";
import { getInvoiceById } from "@/features/invoices/queries";
import { resolveInvoiceLang, type Lang } from "@/features/invoices/print-labels";
import { getPurchaseOrderById } from "@/features/purchases/queries";
import { PURCHASE_PRINT_LABELS } from "@/features/purchases/print-labels";
import { getWaiterDailyReport } from "@/features/waiters/queries";
import type { SystemSettingsData } from "@/features/settings/queries";
import { dictionaries } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/server";
import { CURRENCY_LABEL } from "@/lib/currency";
import { formatDate, parseDateInputValue } from "@/lib/date";
import { hasFeature } from "@/lib/features";
import { hasAnyPermission } from "@/lib/permissions";
import type { PrintDocRef } from "@/lib/print-document";
import type { ReceiptPrintOptions } from "@/lib/print-method";
import {
  isReceiptPaperSize,
  resolveReceiptTextSize,
  type ReceiptPaperSize,
  type ReceiptTextSize,
} from "@/lib/receipt-paper";

/**
 * Receipts the Android printer apps print, for every printable document
 * (sales invoice, purchase invoice, waiter daily report). Each document is
 * turned into the same ReceiptLine list, which the Thermer JSON / image and
 * the ESC/POS HTML render.
 */

export type DocumentReceipt = {
  lines: ReceiptLine[];
  lang: Lang;
  dir: "rtl" | "ltr";
  paper: ReceiptPaperSize;
  textSize: ReceiptTextSize;
  needsImage: boolean;
};

export type DocumentReceiptResult =
  | { ok: true; receipt: DocumentReceipt }
  | { ok: false; reason: "notFound" | "empty" };

/** Whether the signed-in user may print this document — the same access
 * its print page requires. */
export async function canPrintDocument(ref: PrintDocRef): Promise<boolean> {
  switch (ref.kind) {
    case "invoice":
      return hasAnyPermission(["POS_VIEW", "INVOICES_VIEW"]);
    case "purchase":
      return hasAnyPermission(["PURCHASES_VIEW"]);
    case "waiter-report":
      return (await hasAnyPermission(["ORDERS_VIEW"])) && (await hasFeature("WAITERS"));
  }
}

function pickLang(requested: string | undefined, fallback: string): Lang {
  const value = requested?.toLowerCase();
  return resolveInvoiceLang(
    value === "ar" || value === "fr" || value === "en" ? value : undefined,
    fallback,
  );
}

function finish(
  lines: ReceiptLine[],
  lang: Lang,
  options: ReceiptPrintOptions,
  defaultPaper: ReceiptPaperSize,
  settings: SystemSettingsData,
): DocumentReceiptResult {
  const textSize = resolveReceiptTextSize(options.textSize, settings.receiptTextSize);
  return {
    ok: true,
    receipt: {
      lines,
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      paper: isReceiptPaperSize(options.paper) ? options.paper : defaultPaper,
      textSize,
      needsImage: receiptNeedsImage(lines, lang, textSize),
    },
  };
}

/** Language / paper / text size come from the print page (`options`),
 * validated here; each falls back to the document's own default. */
export async function buildDocumentReceipt(
  ref: PrintDocRef,
  settings: SystemSettingsData,
  options: ReceiptPrintOptions = {},
): Promise<DocumentReceiptResult> {
  switch (ref.kind) {
    case "invoice": {
      const invoice = await getInvoiceById(ref.id);
      if (!invoice) return { ok: false, reason: "notFound" };
      if (invoice.items.length === 0) return { ok: false, reason: "empty" };
      const { lines, needsImage, paper, textSize, dir } = buildReceiptLines(
        invoice,
        settings,
        options,
      );
      const { lang } = resolveReceiptOptions(invoice, settings, options);
      return { ok: true, receipt: { lines, lang, dir, paper, textSize, needsImage } };
    }

    case "purchase": {
      const order = await getPurchaseOrderById(ref.id);
      if (!order) return { ok: false, reason: "notFound" };
      if (order.items.length === 0) return { ok: false, reason: "empty" };
      const lang = pickLang(options.lang, settings.receiptLanguage ?? order.language);
      // Purchase invoices default to A5, like their print page.
      return finish(purchaseLines(order, settings, lang), lang, options, "A5", settings);
    }

    case "waiter-report": {
      const day = parseDateInputValue(ref.date!);
      const report = await getWaiterDailyReport(ref.id, day);
      if (!report) return { ok: false, reason: "notFound" };
      const lang = pickLang(options.lang, settings.receiptLanguage ?? (await getLocale()));
      return finish(
        waiterReportLines(report, day, settings, lang),
        lang,
        options,
        settings.receiptPaperSize,
        settings,
      );
    }
  }
}

type PurchaseOrder = NonNullable<Awaited<ReturnType<typeof getPurchaseOrderById>>>;

function purchaseLines(order: PurchaseOrder, settings: SystemSettingsData, lang: Lang): ReceiptLine[] {
  const style = settings.receiptStyle;
  const t = PURCHASE_PRINT_LABELS[lang];
  const total = order.items.reduce(
    (sum, item) => sum + Number(item.unitCost) * Number(item.quantity),
    0,
  );
  const weight = order.items.reduce(
    (sum, item) => sum + Number(item.product.weight ?? 0) * Number(item.quantity),
    0,
  );

  const lines: ReceiptLine[] = [
    { kind: "center", text: settings.appName, bold: true },
    { kind: "title", text: style === "bold" ? t.title.toLocaleUpperCase(lang) : t.title },
    { kind: "center", text: order.orderNumber, ltr: true },
    { kind: "center", text: formatDate(order.createdAt), ltr: true },
    { kind: "rule" },
    { kind: "text", text: `${t.supplier}: ${order.supplier.name}` },
  ];
  if (order.supplier.phone?.trim()) {
    lines.push({ kind: "text", text: `${t.phone}: ${order.supplier.phone}` });
  }
  if (style === "classic") lines.push({ kind: "rule" });
  else {
    if (style === "bold") lines.push({ kind: "rule" });
    lines.push(...sectionLines(style, `${t.itemsSection} (${order.items.length})`, lang));
  }
  for (const item of order.items) {
    const qty = Number(item.quantity);
    const unit = Number(item.unitCost);
    lines.push({
      kind: "item",
      name: item.product.name,
      detail: `${quantity(qty)} x ${amount(unit, 4)}`,
      total: amount(qty * unit),
    });
  }
  lines.push({ kind: "rule" });
  if (style !== "classic") lines.push(...sectionLines(style, t.summarySection, lang));
  lines.push(
    { kind: "row", left: t.itemsCount, right: String(order.items.length) },
    // The label already says "(kg)".
    { kind: "row", left: t.totalWeight, right: weight.toFixed(2) },
    { kind: "total", label: t.total, value: `${amount(total)} ${CURRENCY_LABEL[lang]}` },
    { kind: "rule" },
    { kind: "text", text: `${t.supplierSignature}:` },
    // Room to sign (non-breaking spaces, so the blank lines keep a height).
    { kind: "text", text: "\u00a0" },
    { kind: "text", text: "\u00a0" },
    { kind: "text", text: "\u00a0" },
    { kind: "rule" },
  );
  return lines;
}

type WaiterReport = NonNullable<Awaited<ReturnType<typeof getWaiterDailyReport>>>;

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function waiterReportLines(
  report: WaiterReport,
  day: Date,
  settings: SystemSettingsData,
  lang: Lang,
): ReceiptLine[] {
  const style = settings.receiptStyle;
  if (style !== "classic") return styledWaiterReportLines(report, day, settings, lang, style);

  const dict = dictionaries[lang];
  const labels = dict.waiters.dailyReport;
  const currency = CURRENCY_LABEL[lang];
  const typeLabel = (type: "RETAIL" | "DINE_IN" | "TAKEAWAY") =>
    type === "DINE_IN"
      ? dict.dashboard.cafeDineInLabel
      : type === "TAKEAWAY"
        ? dict.dashboard.cafeTakeawayLabel
        : type;

  const { grandTotal, paidTotal, remainingTotal } = waiterTotals(report);

  const lines: ReceiptLine[] = [
    { kind: "center", text: settings.appName, bold: true },
    { kind: "title", text: labels.documentTitle },
    { kind: "text", text: `${labels.waiterLabel}: ${report.waiter.name}` },
    { kind: "text", text: `${labels.dateHeading}: ${formatDate(day)}` },
    { kind: "rule" },
    { kind: "center", text: labels.ordersSection, bold: true },
  ];
  if (report.invoices.length === 0) {
    lines.push({ kind: "center", text: labels.noOrders });
  }
  for (const invoice of report.invoices) {
    const type = `${typeLabel(invoice.type)}${invoice.tableName ? `-${invoice.tableName}` : ""}`;
    lines.push(
      { kind: "row", left: invoice.invoiceNumber, right: amount(invoice.total), bold: true, ltr: true },
      {
        kind: "text",
        text: `${formatTime(invoice.createdAt)} · ${type} · ${dict.statusLabels.paymentStatus[invoice.paymentStatus]}`,
      },
    );
  }

  if (report.products.length > 0) {
    lines.push({ kind: "rule" }, { kind: "center", text: labels.productsSection, bold: true });
    for (const product of report.products) {
      lines.push({
        kind: "item",
        name: product.name,
        detail: `x ${quantity(product.quantity)}`,
        total: amount(product.total),
      });
    }
  }

  lines.push(
    { kind: "rule" },
    { kind: "row", left: labels.ordersCount, right: String(report.invoices.length) },
    { kind: "row", left: labels.paidTotal, right: amount(paidTotal) },
    { kind: "row", left: labels.remainingTotal, right: amount(remainingTotal), bold: true },
    { kind: "total", label: labels.grandTotal, value: `${amount(grandTotal)} ${currency}` },
    { kind: "rule" },
    { kind: "center", text: labels.thankYou, bold: true },
  );
  return lines;
}

function waiterTotals(report: WaiterReport) {
  const grandTotal = report.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const paidTotal = report.invoices.reduce(
    (sum, invoice) =>
      sum + (invoice.paymentStatus === "PAID" ? invoice.total : invoice.paidAmount),
    0,
  );
  return { grandTotal, paidTotal, remainingTotal: Math.max(0, grandTotal - paidTotal) };
}

/** The "bold" (black section bands) and "icons" (plain section headings,
 * subtitle) styles — the same sections as their print page. */
function styledWaiterReportLines(
  report: WaiterReport,
  day: Date,
  settings: SystemSettingsData,
  lang: Lang,
  style: "bold" | "icons",
): ReceiptLine[] {
  const labels = dictionaries[lang].waiters.dailyReport;
  const currency = CURRENCY_LABEL[lang];
  const money = (value: number) => `${amount(value)} ${currency}`;
  // Several values on one side of a row: each is bidi-isolated on Arabic
  // receipts, so the numbers keep their order in the RTL line.
  const values = (...parts: string[]) =>
    parts.map((part) => (lang === "ar" ? `\u2068${part}\u2069` : part)).join("  ");
  const inverse = style === "bold";
  const section = (text: string) => sectionLines(style, text, lang);
  const { grandTotal, paidTotal, remainingTotal } = waiterTotals(report);
  const productsTotal = report.products.reduce((sum, product) => sum + product.total, 0);
  const productsQuantity = report.products.reduce((sum, product) => sum + product.quantity, 0);

  const lines: ReceiptLine[] = [
    { kind: "center", text: settings.appName, bold: true },
    { kind: "title", text: inverse ? labels.documentTitle.toLocaleUpperCase(lang) : labels.documentTitle },
  ];
  if (!inverse) lines.push({ kind: "center", text: labels.subtitle });
  lines.push(
    { kind: "text", text: `${labels.waiterLabel}: ${report.waiter.name}` },
    { kind: "text", text: `${labels.dateHeading}: ${formatDate(day)}` },
    { kind: "text", text: `${labels.timeHeading}: ${formatTime(new Date())}` },
    { kind: "rule" },
    ...section(`${labels.ordersSection} (${report.invoices.length})`),
  );
  if (report.invoices.length === 0) lines.push({ kind: "center", text: labels.noOrders });
  report.invoices.forEach((invoice, index) => {
    lines.push({
      kind: "row",
      left: inverse ? `${index + 1}. ${invoice.invoiceNumber}` : invoice.invoiceNumber,
      ltr: true,
      right: values(formatTime(invoice.createdAt), money(invoice.total)),
    });
  });
  lines.push(
    { kind: "rule" },
    { kind: "row", left: `${labels.totalOrders}:`, right: money(grandTotal), bold: true },
  );

  if (report.products.length > 0) {
    if (inverse) lines.push({ kind: "rule" });
    lines.push(...section(`${labels.productsSection} (${report.products.length})`));
    for (const product of report.products) {
      lines.push({
        kind: "row",
        left: product.name,
        right: values(`${quantity(product.quantity)} x`, money(product.total)),
      });
    }
    lines.push(
      { kind: "rule" },
      {
        kind: "row",
        left: `${labels.totalProducts}:`,
        right: values(quantity(productsQuantity), money(productsTotal)),
        bold: true,
      },
    );
  }

  if (inverse) lines.push({ kind: "rule" });
  lines.push(
    ...section(labels.paymentSection),
    { kind: "row", left: `${labels.totalAmount}:`, right: money(grandTotal) },
    { kind: "row", left: `${labels.paidTotal}:`, right: money(paidTotal) },
    { kind: "total", label: `${labels.remainingTotal}:`, value: money(remainingTotal) },
    { kind: "rule" },
    {
      kind: "center",
      text: inverse ? labels.thankYou : labels.thankYou.toLocaleUpperCase(lang),
      bold: true,
    },
  );
  return lines;
}
