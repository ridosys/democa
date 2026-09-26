import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReceiptLine } from "@/features/invoices/bluetooth-receipt";
import {
  DEFAULT_RECEIPT_TEXT_SIZE,
  receiptPrinterDots,
  type ReceiptPaperSize,
  type ReceiptTextSize,
} from "@/lib/receipt-paper";

/**
 * Receipt HTML for the Android "Open ESC/POS Print Service" app. The app
 * renders each HTML page in a WebView exactly as wide as the printer's
 * print area and prints the bitmap, so Arabic is shaped and laid out
 * right-to-left by Chromium itself. Sizes are in `vw` (a fraction of the
 * paper width) because the WebView's CSS pixel width depends on the
 * phone's screen density, not on the paper.
 */

const MAX_LOGO_BYTES = 300 * 1024;

/** Base font size, as a share of the paper width: 6.4vw on a 58mm roll,
 * and on wider rolls the same printed size as 4.6vw on an 80mm one. */
function baseVw(paper: ReceiptPaperSize): number {
  const dots = receiptPrinterDots(paper);
  return dots <= 384 ? 6.4 : (4.6 * 576) / dots;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * The logo as a data: URI — the app screenshots the page as soon as it has
 * loaded, so the image must already be in the HTML. Cloudinary logos are
 * resized and flattened to a small JPG first; bundled logos are read from
 * /public. Null (receipt printed without a logo) on any failure.
 */
export async function receiptLogoDataUri(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    let bytes: Buffer;
    let mime: string;
    if (/^https?:\/\//i.test(logoUrl)) {
      const url =
        logoUrl.includes("res.cloudinary.com") && logoUrl.includes("/upload/")
          ? logoUrl.replace("/upload/", "/upload/c_limit,w_300,b_white,f_jpg/")
          : logoUrl;
      const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) return null;
      mime = response.headers.get("content-type")?.split(";")[0] ?? "";
      bytes = Buffer.from(await response.arrayBuffer());
    } else if (logoUrl.startsWith("/") && !logoUrl.includes("..")) {
      const file = path.join(process.cwd(), "public", logoUrl);
      mime = MIME_BY_EXT[path.extname(file).toLowerCase()] ?? "";
      bytes = await readFile(file);
    } else {
      return null;
    }
    if (!mime.startsWith("image/") || bytes.length > MAX_LOGO_BYTES) return null;
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export function buildEscposReceiptHtml({
  lines,
  dir,
  paper,
  textSize = DEFAULT_RECEIPT_TEXT_SIZE,
  logo,
}: {
  lines: ReceiptLine[];
  dir: "rtl" | "ltr";
  paper: ReceiptPaperSize;
  textSize?: ReceiptTextSize;
  logo: string | null;
}): string {
  const base = ((baseVw(paper) * textSize) / 100).toFixed(2);
  // Numbers / codes stay left-to-right inside an RTL receipt.
  const row = (left: string, right: string, cls = "", ltrLeft = false) =>
    `<table class="row ${cls}"><tr>` +
    `<td>${ltrLeft ? `<bdi dir="ltr">${escapeHtml(left)}</bdi>` : escapeHtml(left)}</td>` +
    `<td class="end">${escapeHtml(right)}</td>` +
    `</tr></table>`;

  const body = lines
    .map((line) => {
      switch (line.kind) {
        case "title":
          return `<div class="center title">${escapeHtml(line.text)}</div>`;
        case "center":
          return `<div class="center${line.bold ? " bold" : ""}"${line.ltr ? ' dir="ltr"' : ""}>${escapeHtml(line.text)}</div>`;
        case "text":
          return `<div>${escapeHtml(line.text)}</div>`;
        case "row":
          return row(line.left, line.right, line.bold ? "bold" : "", line.ltr);
        case "item":
          return `<div class="bold">${escapeHtml(line.name)}</div>${row(line.detail, line.total, "small", true)}`;
        case "total":
          return row(line.label, line.value, "bold total");
        case "section":
          return `<div class="section${line.inverse ? " inverse" : ""}">${escapeHtml(line.text)}</div>`;
        case "rule":
          return `<div class="rule"></div>`;
      }
    })
    .join("");

  const css = `
@page { margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: 100%; background: #fff; color: #000; }
body { font-family: sans-serif; font-size: ${base}vw; line-height: 1.35; padding: 1.5vw 2vw 0; }
.center { text-align: center; }
.bold { font-weight: bold; }
.title { font-size: 1.5em; font-weight: bold; }
.logo { display: block; margin: 0 auto 1vw; max-width: 55vw; max-height: 30vw; }
.row { width: 100%; border-collapse: collapse; }
.row td { padding: 0; vertical-align: top; }
.row td.end { text-align: end; white-space: nowrap; padding-inline-start: 2vw; }
.small { font-size: 0.92em; }
.total { font-size: 1.3em; }
.rule { border-top: 0.6vw dashed #000; margin: 1.6vw 0; }
.section { font-size: 1.1em; font-weight: bold; margin: 1.2vw 0 0.8vw; }
.section.inverse { background: #000; color: #fff; padding: 0.4vw 2vw; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.feed { height: 12vw; }`;

  return (
    `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style>${css}</style></head><body>` +
    (logo ? `<img class="logo" src="${logo}" alt="">` : "") +
    body +
    `<div class="feed"></div></body></html>`
  );
}
