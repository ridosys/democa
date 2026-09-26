/**
 * Print defaults picked in Settings → Printing: the language printed
 * documents open in, and the look (style) of each document type.
 *
 * Plain module (no "server-only"): shared by the settings forms and the
 * print pages.
 */

/** "auto" = each document's own language (the sales / purchase invoice's
 * saved language, the staff member's UI language for waiter invoices). */
export const RECEIPT_LANGUAGES = ["auto", "ar", "fr", "en"] as const;

export type ReceiptLanguage = (typeof RECEIPT_LANGUAGES)[number];

export function isReceiptLanguage(value: unknown): value is ReceiptLanguage {
  return typeof value === "string" && (RECEIPT_LANGUAGES as readonly string[]).includes(value);
}

/** The saved default language, or null for "auto". */
export function resolveReceiptLanguage(value: unknown): "ar" | "fr" | "en" | null {
  return isReceiptLanguage(value) && value !== "auto" ? value : null;
}

/**
 * Looks of the printed documents, picked once in settings and applied to
 * all of them (sales invoice, purchase invoice, daily waiter invoice):
 *  - classic: the plain receipt layout;
 *  - bold:    black section bands, dotted leaders, a boxed grand total;
 *  - icons:   section icons, dashed rules, typewriter text.
 */
export const RECEIPT_STYLES = ["classic", "bold", "icons"] as const;

export type ReceiptStyle = (typeof RECEIPT_STYLES)[number];

export const DEFAULT_RECEIPT_STYLE: ReceiptStyle = "classic";

export function isReceiptStyle(value: unknown): value is ReceiptStyle {
  return typeof value === "string" && (RECEIPT_STYLES as readonly string[]).includes(value);
}

export function resolveReceiptStyle(value: unknown): ReceiptStyle {
  return isReceiptStyle(value) ? value : DEFAULT_RECEIPT_STYLE;
}
