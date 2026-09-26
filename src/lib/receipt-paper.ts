/**
 * Paper sizes the printed invoices (sales invoice, daily waiter invoice)
 * can be laid out for. Thermal rolls (58mm / 80mm) have a fixed width and
 * an open-ended length — the page height is measured from the rendered
 * receipt at print time — while A5 / A4 are regular sheets.
 *
 * Plain module (no "server-only"): shared by the print pages, the paper
 * switcher and the PDF export button.
 */
export const RECEIPT_PAPER_SIZES = [
  "58mm",
  "76mm",
  "80mm",
  "112mm",
  "A6",
  "A5",
  "A4",
  "Letter",
] as const;

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
  /** Thermal rolls: print-head width in dots at 203 dpi (what the Android
   * printer apps print on). Null for sheets. */
  dots: number | null;
};

export const RECEIPT_PAPER_SPECS: Record<ReceiptPaperSize, ReceiptPaperSpec> = {
  "58mm": { widthMm: 58, heightMm: null, paddingMm: 3, fontPx: 11, dots: 384 },
  "76mm": { widthMm: 76, heightMm: null, paddingMm: 4, fontPx: 12, dots: 512 },
  "80mm": { widthMm: 80, heightMm: null, paddingMm: 4, fontPx: 12, dots: 576 },
  "112mm": { widthMm: 112, heightMm: null, paddingMm: 5, fontPx: 13, dots: 832 },
  A6: { widthMm: 105, heightMm: 148, paddingMm: 7, fontPx: 12, dots: null },
  A5: { widthMm: 148, heightMm: 210, paddingMm: 10, fontPx: 14, dots: null },
  A4: { widthMm: 210, heightMm: 297, paddingMm: 14, fontPx: 16, dots: null },
  Letter: { widthMm: 216, heightMm: 279, paddingMm: 14, fontPx: 16, dots: null },
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

/** Print-head width in dots for the Android printer apps. Sheet sizes
 * (A4, …) can't go on a thermal roll, so they print as an 80mm receipt. */
export function receiptPrinterDots(paper: ReceiptPaperSize): number {
  return RECEIPT_PAPER_SPECS[paper].dots ?? 576;
}

/**
 * Text size of the printed receipt, in % of the paper's base font size —
 * picked per print on the print page (`?text=`).
 */
export const RECEIPT_TEXT_SIZES = [80, 90, 100, 110, 120, 130, 140, 150, 175, 200] as const;

export type ReceiptTextSize = (typeof RECEIPT_TEXT_SIZES)[number];

export const DEFAULT_RECEIPT_TEXT_SIZE: ReceiptTextSize = 100;

export function resolveReceiptTextSize(value: unknown): ReceiptTextSize {
  const number = typeof value === "string" ? Number(value) : value;
  return (RECEIPT_TEXT_SIZES as readonly unknown[]).includes(number)
    ? (number as ReceiptTextSize)
    : DEFAULT_RECEIPT_TEXT_SIZE;
}
