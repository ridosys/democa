"use server";

import { gzipSync } from "node:zlib";
import { prisma } from "@/lib/prisma";
import { hasAnyPermission } from "@/lib/permissions";
import { createInvoicePrintToken } from "@/lib/print-token";
import { getSystemSettings } from "@/features/settings/queries";
import { getInvoiceById } from "@/features/invoices/queries";
import { buildReceiptLines } from "@/features/invoices/bluetooth-receipt";
import {
  buildEscposReceiptHtml,
  receiptLogoDataUri,
} from "@/features/invoices/escpos-receipt";
import { getDictionary } from "@/i18n/server";

const INVOICE_ID = /^[a-z0-9]{10,40}$/i;

const ESCPOS_PACKAGE = "com.farminos.print";

export async function createBluetoothPrintLink(
  invoiceId: unknown,
): Promise<{ path: string } | { error: string }> {
  const t = await getDictionary();
  if (!(await hasAnyPermission(["POS_VIEW", "INVOICES_VIEW"]))) {
    return { error: t.common.insufficientPermissionError };
  }
  if (typeof invoiceId !== "string" || !INVOICE_ID.test(invoiceId)) {
    return { error: t.bluetoothPrint.linkError };
  }

  const [settings, invoice] = await Promise.all([
    getSystemSettings(),
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    }),
  ]);
  if (settings.printMethod !== "thermer")
    return { error: t.bluetoothPrint.disabledError };
  if (!invoice) return { error: t.bluetoothPrint.notFoundError };

  const token = createInvoicePrintToken(invoice.id);
  return {
    path: `/api/print/invoice/${encodeURIComponent(invoice.id)}?token=${encodeURIComponent(token)}`,
  };
}

/**
 * Builds the `intent://` URL that makes the "Open ESC/POS Print Service"
 * app print one invoice on its default printer, without Android's printer
 * picker. The receipt HTML travels inside the intent itself (a base64,
 * gzipped JSON array of HTML pages — the app's documented format), so the
 * app never calls back to this server and needs no token.
 */
export async function createEscposPrintIntent(
  invoiceId: unknown,
): Promise<{ url: string } | { error: string }> {
  const t = await getDictionary();
  if (!(await hasAnyPermission(["POS_VIEW", "INVOICES_VIEW"]))) {
    return { error: t.common.insufficientPermissionError };
  }
  if (typeof invoiceId !== "string" || !INVOICE_ID.test(invoiceId)) {
    return { error: t.escposPrint.buildError };
  }

  const [settings, invoice] = await Promise.all([
    getSystemSettings(),
    getInvoiceById(invoiceId),
  ]);
  if (settings.printMethod !== "escpos")
    return { error: t.escposPrint.disabledError };
  if (!invoice) return { error: t.escposPrint.notFoundError };
  if (invoice.items.length === 0) return { error: t.escposPrint.buildError };

  const { lines, dir } = buildReceiptLines(invoice, settings);
  const html = buildEscposReceiptHtml({
    lines,
    dir,
    paper: settings.receiptPaperSize,
    logo: await receiptLogoDataUri(settings.logoUrl),
  });
  const content = gzipSync(
    Buffer.from(JSON.stringify([html]), "utf8"),
  ).toString("base64");

  const extras = [
    "scheme=print-intent",
    `package=${ESCPOS_PACKAGE}`,
    `S.content=${encodeURIComponent(content)}`,
  ];
  return { url: `intent://#Intent;${extras.join(";")};end` };
}
