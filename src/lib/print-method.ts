/**
 * How receipts are printed:
 *  - "browser": the browser's own print dialog (default);
 *  - "thermer": the Android Thermer / Bluetooth Print app (Browser Print JSON);
 *  - "escpos":  the Android "Open ESC/POS Print Service" app, sent the
 *               receipt HTML directly through its `print-intent` intent.
 *
 * Plain module (no "server-only"): shared by the settings form and the
 * print buttons.
 */
export const PRINT_METHODS = ["browser", "thermer", "escpos"] as const;

export type PrintMethod = (typeof PRINT_METHODS)[number];

export const DEFAULT_PRINT_METHOD: PrintMethod = "browser";

export function isPrintMethod(value: unknown): value is PrintMethod {
  return typeof value === "string" && (PRINT_METHODS as readonly string[]).includes(value);
}

/** What the print page is showing (its language / paper / text size
 * switchers), so a printer app prints the receipt the same way. Validated
 * on the server. */
export type ReceiptPrintOptions = { lang?: string; paper?: string; textSize?: string };

export function resolvePrintMethod(value: unknown): PrintMethod {
  return isPrintMethod(value) ? value : DEFAULT_PRINT_METHOD;
}
