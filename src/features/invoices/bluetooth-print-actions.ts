"use server";

import { gzipSync } from "node:zlib";
import { createPrintToken } from "@/lib/print-token";
import { parsePrintDocRef, printDocSubject } from "@/lib/print-document";
import { getSystemSettings } from "@/features/settings/queries";
import {
  buildDocumentReceipt,
  canPrintDocument,
} from "@/features/print/receipt-documents";
import {
  buildEscposReceiptHtml,
  receiptLogoDataUri,
} from "@/features/invoices/escpos-receipt";
import { getDictionary } from "@/i18n/server";
import type { ReceiptPrintOptions } from "@/lib/print-method";

const ESCPOS_PACKAGE = "com.farminos.print";

/**
 * JSON with every non-ASCII character written as a \uXXXX escape. The app
 * decodes the unzipped bytes 32 at a time, each chunk on its own, so a
 * multi-byte UTF-8 character (every Arabic letter) that straddles two
 * chunks turns into "?". Pure ASCII has no multi-byte characters to split,
 * and the app's JSON parser turns the escapes back into the exact text.
 */
function asciiJson(value: unknown): string {
  return JSON.stringify(value).replace(
    /[\u0080-\uffff]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/**
 * Signed, short-lived response URL of one document (invoice, purchase
 * invoice or waiter daily report) for the Thermer app. `doc` is a
 * PrintDocRef, validated here.
 */
export async function createBluetoothPrintLink(
  doc: unknown,
  options: ReceiptPrintOptions = {},
): Promise<{ path: string } | { error: string }> {
  const t = await getDictionary();
  const ref = parsePrintDocRef(doc);
  if (!ref) return { error: t.bluetoothPrint.linkError };
  if (!(await canPrintDocument(ref))) {
    return { error: t.common.insufficientPermissionError };
  }

  const settings = await getSystemSettings();
  if (settings.printMethod !== "thermer") return { error: t.bluetoothPrint.disabledError };
  const built = await buildDocumentReceipt(ref, settings, options);
  if (!built.ok) {
    return {
      error: built.reason === "notFound" ? t.bluetoothPrint.notFoundError : t.bluetoothPrint.linkError,
    };
  }

  // lang / paper / text are only display choices (validated by the
  // endpoint); the token alone grants access, to this one document.
  const query = new URLSearchParams({ token: createPrintToken(printDocSubject(ref)) });
  if (ref.date) query.set("date", ref.date);
  if (typeof options.lang === "string") query.set("lang", options.lang);
  if (typeof options.paper === "string") query.set("paper", options.paper);
  if (typeof options.textSize === "string") query.set("text", options.textSize);
  return { path: `/api/print/${ref.kind}/${encodeURIComponent(ref.id)}?${query}` };
}

/**
 * Builds the `intent://` URL that makes the "Open ESC/POS Print Service"
 * app print one document on its default printer, without Android's printer
 * picker. The receipt HTML travels inside the intent itself (a base64,
 * gzipped JSON array of HTML pages — the app's documented format), so the
 * app never calls back to this server and needs no token.
 */
export async function createEscposPrintIntent(
  doc: unknown,
  options: ReceiptPrintOptions = {},
): Promise<{ url: string } | { error: string }> {
  const t = await getDictionary();
  const ref = parsePrintDocRef(doc);
  if (!ref) return { error: t.escposPrint.buildError };
  if (!(await canPrintDocument(ref))) {
    return { error: t.common.insufficientPermissionError };
  }

  const settings = await getSystemSettings();
  if (settings.printMethod !== "escpos") return { error: t.escposPrint.disabledError };
  const built = await buildDocumentReceipt(ref, settings, options);
  if (!built.ok) {
    return {
      error: built.reason === "notFound" ? t.escposPrint.notFoundError : t.escposPrint.buildError,
    };
  }

  const { lines, dir, paper, textSize } = built.receipt;
  const html = buildEscposReceiptHtml({
    lines,
    dir,
    paper,
    textSize,
    logo: await receiptLogoDataUri(settings.logoUrl),
  });
  const content = gzipSync(Buffer.from(asciiJson([html]), "utf8")).toString("base64");

  const extras = [
    "scheme=print-intent",
    `package=${ESCPOS_PACKAGE}`,
    `S.content=${encodeURIComponent(content)}`,
  ];
  return { url: `intent://#Intent;${extras.join(";")};end` };
}
