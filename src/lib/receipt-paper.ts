/**
 * Paper sizes the printed invoices (sales invoice, daily waiter invoice)
 * can be laid out for. Thermal rolls (58mm / 80mm) have a fixed width and
 * an open-ended length — the page height is measured from the rendered
 * receipt at print time — while A5 / A4 are regular sheets.
 *
 * Plain module (no "server-only"): shared by the print pages, the paper
 * switcher and the PDF export button.
 */
export const RECEIPT_PAPER_SIZES = ["58mm", "80mm", "A5", "A4"] as const;

export type ReceiptPaperSize = (typeof RECEIPT_PAPER_SIZES)[number];

export const DEFAULT_RECEIPT_PAPER: ReceiptPaperSize = "58mm";

export type ReceiptPaperSpec = {
  /** Sheet / roll width. */
  widthMm: number;
  /** Fixed sheet height, or null for a continuous thermal roll. */
  heightMm: number | null;
  /** Inner padding between the paper edge and the printed content. */
  paddingMm: number;
  /** Base font size — everything else on the receipt is sized in `em`. */
  fontPx: number;
};

export const RECEIPT_PAPER_SPECS: Record<ReceiptPaperSize, ReceiptPaperSpec> = {
  "58mm": { widthMm: 58, heightMm: null, paddingMm: 3, fontPx: 11 },
  "80mm": { widthMm: 80, heightMm: null, paddingMm: 4, fontPx: 12 },
  A5: { widthMm: 148, heightMm: 210, paddingMm: 10, fontPx: 14 },
  A4: { widthMm: 210, heightMm: 297, paddingMm: 14, fontPx: 16 },
};

export function isReceiptPaperSize(value: unknown): value is ReceiptPaperSize {
  return (
    typeof value === "string" &&
    (RECEIPT_PAPER_SIZES as readonly string[]).includes(value)
  );
}

/** `?paper=` override when valid, else the saved system default. */
export function resolveReceiptPaper(
  param: string | undefined,
  fallback: string | null | undefined,
): ReceiptPaperSize {
  if (isReceiptPaperSize(param)) return param;
  if (isReceiptPaperSize(fallback)) return fallback;
  return DEFAULT_RECEIPT_PAPER;
}

/** Thermal rolls are too narrow for wide tables — they get stacked rows. */
export function isThermalPaper(paper: ReceiptPaperSize): boolean {
  return RECEIPT_PAPER_SPECS[paper].heightMm === null;
}
